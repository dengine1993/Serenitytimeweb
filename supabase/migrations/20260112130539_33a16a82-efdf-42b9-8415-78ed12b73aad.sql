INSERT INTO app_config (key, value)
VALUES ('product_catalog', '{
  "version": "2.4.1",
  "updated_at": "2026-01-12",
  "products": {
    "premium_subscription_monthly": {
      "id": "premium_subscription_monthly",
      "name": "Premium Monthly Subscription",
      "description": "Ежемесячная подписка Premium",
      "amount": { "value": 690, "currency": "RUB" },
      "paymentType": "subscription",
      "entitlement": { "kind": "subscription", "plan": "premium", "intervalMonths": 1 }
    },
    "premium_subscription_yearly": {
      "id": "premium_subscription_yearly",
      "name": "Premium Yearly Subscription",
      "description": "Годовая подписка Premium",
      "amount": { "value": 6990, "currency": "RUB" },
      "paymentType": "subscription",
      "entitlement": { "kind": "subscription", "plan": "premium", "intervalMonths": 12 }
    },
    "jiva_extra_dialog": {
      "id": "jiva_extra_dialog",
      "name": "Jīva Extra Dialog",
      "description": "Внеочередной диалог Дживы",
      "amount": { "value": 59, "currency": "RUB" },
      "paymentType": "oneoff",
      "entitlement": { "kind": "jiva_extra", "quantity": 1 }
    },
    "researcher_topup_100": {
      "id": "researcher_topup_100",
      "name": "Researcher +100 сообщений",
      "description": "Дополнительные 100 сообщений в исследователе",
      "amount": { "value": 49, "currency": "RUB" },
      "paymentType": "oneoff",
      "entitlement": { "kind": "researcher_topup", "messages": 100 }
    }
  }
}'::jsonb)
ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = now();