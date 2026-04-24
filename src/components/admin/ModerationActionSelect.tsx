import { AlertTriangle, Ban, Clock, CheckCircle } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

export type ModerationActionType = 
  | 'warning' 
  | 'temp_ban_24h' 
  | 'temp_ban_3d' 
  | 'temp_ban_7d' 
  | 'permanent_ban' 
  | 'restriction_lifted';

interface ModerationActionSelectProps {
  value: ModerationActionType;
  onChange: (value: ModerationActionType) => void;
  warningsCount: number;
  tempBansCount: number;
  isAdmin: boolean;
  isBlocked: boolean;
  isRestricted: boolean;
}

interface ActionOption {
  value: ModerationActionType;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

const allActions: ActionOption[] = [
  {
    value: 'warning',
    label: 'Предупреждение',
    description: 'Отправить предупреждение пользователю',
    icon: <AlertTriangle className="h-4 w-4" />,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10'
  },
  {
    value: 'temp_ban_24h',
    label: 'Бан на 24 часа',
    description: 'Ограничить доступ к сообществу на сутки',
    icon: <Clock className="h-4 w-4" />,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10'
  },
  {
    value: 'temp_ban_3d',
    label: 'Бан на 3 дня',
    description: 'Ограничить доступ к сообществу на 3 дня',
    icon: <Clock className="h-4 w-4" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-600/10'
  },
  {
    value: 'temp_ban_7d',
    label: 'Бан на 7 дней',
    description: 'Ограничить доступ к сообществу на неделю',
    icon: <Clock className="h-4 w-4" />,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10'
  },
  {
    value: 'permanent_ban',
    label: 'Вечный бан',
    description: 'Заблокировать аккаунт навсегда',
    icon: <Ban className="h-4 w-4" />,
    color: 'text-red-600',
    bgColor: 'bg-red-600/10'
  },
  {
    value: 'restriction_lifted',
    label: 'Снять ограничения',
    description: 'Убрать все ограничения и баны',
    icon: <CheckCircle className="h-4 w-4" />,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10'
  }
];

export function ModerationActionSelect({
  value,
  onChange,
}: ModerationActionSelectProps) {
  return (
    <RadioGroup value={value} onValueChange={(v) => onChange(v as ModerationActionType)}>
      <div className="space-y-2">
        {allActions.map((action) => (
          <div key={action.value}>
            <Label
              htmlFor={action.value}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                value === action.value 
                  ? `border-primary ${action.bgColor}` 
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }`}
            >
              <RadioGroupItem 
                value={action.value} 
                id={action.value}
                className="sr-only"
              />
              <div className={action.color}>
                {action.icon}
              </div>
              <div className="flex-1">
                <span className="font-medium text-sm">{action.label}</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {action.description}
                </p>
              </div>
              {value === action.value && (
                <div className={`h-2 w-2 rounded-full ${action.color.replace('text-', 'bg-')}`} />
              )}
            </Label>
          </div>
        ))}
      </div>
    </RadioGroup>
  );
}

export function getBanDuration(action: ModerationActionType): number | null {
  switch (action) {
    case 'temp_ban_24h':
      return 24;
    case 'temp_ban_3d':
      return 72;
    case 'temp_ban_7d':
      return 168;
    default:
      return null;
  }
}
