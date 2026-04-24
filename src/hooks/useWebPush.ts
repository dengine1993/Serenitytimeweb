import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useWebPush() {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    // Check if Push API is supported
    const supported = 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
      checkSubscription();
    }
  }, []);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      
      if (sub) {
        setIsSubscribed(true);
        setSubscription(sub);
      } else {
        setIsSubscribed(false);
        setSubscription(null);
      }
    } catch (error) {
      console.error("Error checking push subscription:", error);
    }
  };

  const requestPermission = async (): Promise<boolean> => {
    if (!isSupported) {
      console.log("Push notifications not supported");
      return false;
    }

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      return perm === "granted";
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return false;
    }
  };

  const subscribe = async (): Promise<PushSubscription | null> => {
    if (!isSupported || !user) {
      return null;
    }

    try {
      // Request permission first
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        return null;
      }

      // Register service worker
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        registration = await navigator.serviceWorker.register('/sw-push.js');
        await navigator.serviceWorker.ready;
      }

      // VAPID public key
      const vapidPublicKey = 'BE3X9cH3xPBCKl_a6FTPBVsEZjbjzkvUkxSWKBhTFPXGOF5fJ56udyIQ8PuTOyXf19aJ0mMyKeehHwtdyRpGXpk';
      
      // Convert VAPID key to Uint8Array
      const urlBase64ToUint8Array = (base64String: string) => {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
      };

      // Subscribe to push notifications
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      setIsSubscribed(true);
      setSubscription(sub);

      // Save subscription to database
      await saveSubscriptionToDatabase(sub);

      console.log("Push subscription created:", sub);
      return sub;
    } catch (error) {
      console.error("Error subscribing to push notifications:", error);
      return null;
    }
  };

  const unsubscribe = async (): Promise<boolean> => {
    if (!subscription) {
      return false;
    }

    try {
      await subscription.unsubscribe();
      setIsSubscribed(false);
      setSubscription(null);

      // Remove from database
      await removeSubscriptionFromDatabase();

      console.log("Push subscription removed");
      return true;
    } catch (error) {
      console.error("Error unsubscribing from push notifications:", error);
      return false;
    }
  };

  const saveSubscriptionToDatabase = async (sub: PushSubscription) => {
    if (!user) return;

    try {
      const subscriptionJson = sub.toJSON();
      const keys = subscriptionJson.keys as { p256dh: string; auth: string } | undefined;
      
      if (!keys) {
        console.error("No keys in subscription");
        return;
      }

      // Upsert subscription to push_subscriptions table
      const { error } = await supabase
        .from("push_subscriptions")
        .upsert({
          user_id: user.id,
          endpoint: sub.endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error("Error saving push subscription:", error);
      } else {
        console.log("Push subscription saved to database");
      }
    } catch (error) {
      console.error("Error saving push subscription to database:", error);
    }
  };

  const removeSubscriptionFromDatabase = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", user.id);

      if (error) {
        console.error("Error removing push subscription:", error);
      } else {
        console.log("Push subscription removed from database");
      }
    } catch (error) {
      console.error("Error removing push subscription from database:", error);
    }
  };

  return {
    isSupported,
    isSubscribed,
    subscription,
    permission,
    requestPermission,
    subscribe,
    unsubscribe,
  };
}
