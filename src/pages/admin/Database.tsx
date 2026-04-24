import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DataTable } from "@/components/admin/DataTable";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Database as DatabaseIcon,
  Table2,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Menu,
} from "lucide-react";
import { toast } from "sonner";

// Table catalog grouped by domain
const TABLE_GROUPS: { label: string; tables: { name: string; label: string }[] }[] = [
  {
    label: "Контент",
    tables: [
      { name: "posts", label: "Посты" },
      { name: "post_comments", label: "Комментарии" },
      { name: "post_reactions", label: "Реакции постов" },
      { name: "community_messages", label: "Сообщения чата" },
      { name: "message_reactions", label: "Реакции сообщений" },
      { name: "message_read_receipts", label: "Прочтения" },
      { name: "pinned_community_messages", label: "Закреплённые сообщения" },
      { name: "pinned_moments", label: "Закреплённые моменты" },
    ],
  },
  {
    label: "Платежи",
    tables: [
      { name: "subscriptions", label: "Подписки" },
      { name: "payments", label: "Платежи" },
    ],
  },
  {
    label: "Модерация",
    tables: [
      { name: "post_reports", label: "Жалобы на посты" },
      { name: "comment_reports", label: "Жалобы на комменты" },
      { name: "message_reports", label: "Жалобы на сообщения" },
      { name: "moderation_history", label: "История модерации" },
    ],
  },
  {
    label: "AI / Использование",
    tables: [
      { name: "ai_chats", label: "AI чаты" },
      { name: "ai_messages", label: "AI сообщения" },
      { name: "llm_usage", label: "LLM расход" },
      { name: "feature_usage", label: "Лимиты функций" },
      { name: "jiva_memory_chunks", label: "Memory chunks" },
      { name: "jiva_sessions_v2", label: "Сессии v2" },
      { name: "training_examples", label: "Training examples" },
      { name: "trial_events", label: "Trial events" },
      { name: "trial_messages", label: "Trial messages" },
      { name: "trial_sessions", label: "Trial sessions" },
    ],
  },
  {
    label: "Дневник / Кризис",
    tables: [
      { name: "mood_entries", label: "Записи настроения" },
      { name: "smer_entries", label: "СМЭР" },
      { name: "emotion_calendar", label: "Календарь эмоций" },
      { name: "daily_checkins", label: "Чекины" },
      { name: "crisis_sessions", label: "Кризисные сессии" },
      { name: "art_therapy_sessions", label: "Арт-терапия" },
    ],
  },
  {
    label: "Личные чаты",
    tables: [
      { name: "private_conversations", label: "Приватные чаты" },
      { name: "private_messages", label: "Приватные сообщения" },
      { name: "private_chat_requests", label: "Запросы чатов" },
      { name: "friendships", label: "Дружба" },
    ],
  },
  {
    label: "Сториз",
    tables: [
      { name: "story_comments", label: "Комментарии сториз" },
      { name: "story_reactions", label: "Реакции сториз" },
      { name: "story_comment_reactions", label: "Реакции комментов" },
    ],
  },
  {
    label: "Профили / Auth",
    tables: [
      { name: "profiles", label: "Профили" },
      { name: "user_roles", label: "Роли" },
      { name: "community_rules_accepted", label: "Принятие правил" },
      { name: "consent_log", label: "Согласия" },
    ],
  },
  {
    label: "Система",
    tables: [
      { name: "admin_logs", label: "Логи админов" },
      { name: "admin_settings", label: "Настройки" },
      { name: "app_config", label: "Конфиг" },
      { name: "notifications", label: "Уведомления" },
      { name: "notification_preferences", label: "Настройки уведомлений" },
      { name: "push_subscriptions", label: "Push подписки" },
      { name: "system_notifications", label: "Системные уведомления" },
      { name: "referrals_v2", label: "Рефералы" },
    ],
  },
];

const ALL_TABLES = TABLE_GROUPS.flatMap((g) => g.tables);

type Column = {
  key: string;
  label: string;
  type?: "text" | "date" | "boolean" | "json" | "number" | "uuid";
  sortable?: boolean;
};

interface SchemaColumn {
  key: string;
  data_type: string;
  is_pk: boolean;
}

export default function AdminDatabase() {
  const [selectedTable, setSelectedTable] = useState<string>("profiles");
  const [tableData, setTableData] = useState<Record<string, unknown>[]>([]);
  const [tableCounts, setTableCounts] = useState<Record<string, number>>({});
  const [columns, setColumns] = useState<Column[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(TABLE_GROUPS.map((g) => [g.label, true]))
  );
  const [drawerOpen, setDrawerOpen] = useState(false);

  const selectedLabel = useMemo(
    () => ALL_TABLES.find((t) => t.name === selectedTable)?.label ?? selectedTable,
    [selectedTable]
  );

  const callAdmin = useCallback(async (payload: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("admin-database", {
      body: payload,
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  }, []);

  const loadTableCounts = useCallback(async () => {
    try {
      const data = await callAdmin({ mode: "list_tables" });
      setTableCounts(data.tables ?? {});
    } catch (e) {
      console.error(e);
      toast.error("Не удалось загрузить список таблиц");
    }
  }, [callAdmin]);

  const mapDataType = (t: string): Column["type"] => {
    if (t === "boolean") return "boolean";
    if (t === "number") return "number";
    if (t === "json") return "json";
    if (t === "date") return "date";
    if (t === "uuid") return "uuid";
    return "text";
  };

  const loadTableData = useCallback(async () => {
    setLoading(true);
    try {
      // Schema first
      const schema = await callAdmin({ mode: "get_schema", table: selectedTable });
      const cols: Column[] = (schema.columns as SchemaColumn[]).map((c) => ({
        key: c.key,
        label: c.key,
        type: mapDataType(c.data_type),
        sortable: true,
      }));
      // Reorder: id first, created_at last
      cols.sort((a, b) => {
        if (a.key === "id") return -1;
        if (b.key === "id") return 1;
        if (a.key === "created_at") return 1;
        if (b.key === "created_at") return -1;
        return 0;
      });
      setColumns(cols);

      const result = await callAdmin({
        mode: "query",
        table: selectedTable,
        page,
        pageSize,
        search,
        sortKey: sort?.key,
        sortDir: sort?.dir,
      });
      setTableData(result.data ?? []);
      setTotalCount(result.count ?? 0);
      setTableCounts((prev) => ({ ...prev, [selectedTable]: result.count ?? 0 }));
    } catch (e) {
      console.error(e);
      toast.error(`Ошибка загрузки: ${(e as Error).message}`);
      setTableData([]);
      setColumns([]);
    } finally {
      setLoading(false);
    }
  }, [selectedTable, page, pageSize, search, sort, callAdmin]);

  useEffect(() => {
    loadTableCounts();
  }, [loadTableCounts]);

  useEffect(() => {
    loadTableData();
  }, [loadTableData]);

  const handleDelete = async (ids: string[]) => {
    await callAdmin({ mode: "delete", table: selectedTable, ids });
    await loadTableData();
  };

  const handleSelectTable = (name: string) => {
    setSelectedTable(name);
    setPage(1);
    setSearch("");
    setSort(null);
    setDrawerOpen(false);
  };

  const Sidebar = (
    <ScrollArea className="h-[calc(100vh-220px)] lg:h-[calc(100vh-300px)]">
      <div className="space-y-2 p-2">
        {TABLE_GROUPS.map((group) => {
          const isOpen = openGroups[group.label];
          return (
            <Collapsible
              key={group.label}
              open={isOpen}
              onOpenChange={(o) => setOpenGroups((prev) => ({ ...prev, [group.label]: o }))}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between font-semibold h-9"
                >
                  <span className="text-sm">{group.label}</span>
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-0.5 mt-1">
                {group.tables.map((table) => (
                  <Button
                    key={table.name}
                    variant={selectedTable === table.name ? "secondary" : "ghost"}
                    className="w-full justify-start gap-2 h-auto py-1.5 pl-4 text-sm"
                    onClick={() => handleSelectTable(table.name)}
                  >
                    <span className="flex-1 text-left truncate">{table.label}</span>
                    {tableCounts[table.name] !== undefined && (
                      <Badge variant="outline" className="ml-auto text-xs">
                        {tableCounts[table.name]}
                      </Badge>
                    )}
                  </Button>
                ))}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </ScrollArea>
  );

  return (
    <AdminLayout
      title="База данных"
      description="Просмотр и управление данными всех таблиц"
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
        {/* Mobile: Drawer trigger */}
        <div className="lg:hidden">
          <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="w-full justify-start gap-2">
                <Menu className="h-4 w-4" />
                Таблицы ({ALL_TABLES.length})
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] p-0">
              <SheetHeader className="p-4 border-b">
                <SheetTitle className="flex items-center gap-2">
                  <DatabaseIcon className="h-4 w-4" />
                  Таблицы
                </SheetTitle>
              </SheetHeader>
              {Sidebar}
            </SheetContent>
          </Sheet>
        </div>

        {/* Desktop sidebar */}
        <Card className="hidden lg:block lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-lg">
              <span className="flex items-center gap-2">
                <DatabaseIcon className="h-5 w-5" />
                Таблицы
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={loadTableCounts}
                title="Обновить счётчики"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">{Sidebar}</CardContent>
        </Card>

        {/* Table data */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
                <Table2 className="h-5 w-5" />
                <span className="truncate">{selectedLabel}</span>
                <Badge variant="outline">{totalCount}</Badge>
              </CardTitle>
              <code className="text-xs text-muted-foreground hidden sm:inline">
                {selectedTable}
              </code>
            </div>
          </CardHeader>
          <CardContent>
            <DataTable
              data={tableData}
              columns={columns}
              loading={loading}
              totalCount={totalCount}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onSearch={(q) => {
                // simple debounce via timeout
                if ((window as unknown as { __dbSearchT?: number }).__dbSearchT) {
                  window.clearTimeout((window as unknown as { __dbSearchT?: number }).__dbSearchT);
                }
                (window as unknown as { __dbSearchT?: number }).__dbSearchT = window.setTimeout(() => {
                  setPage(1);
                  setSearch(q);
                }, 300);
              }}
              onSort={(key, dir) => {
                setPage(1);
                setSort({ key, dir });
              }}
              onDelete={handleDelete}
              onRefresh={loadTableData}
              selectable
              searchPlaceholder={`Поиск в ${selectedTable}...`}
            />
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
