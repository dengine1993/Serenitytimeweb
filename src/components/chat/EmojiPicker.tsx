import { useState, useMemo, memo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Smile, Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Convert emoji to Twemoji URL
const getTwemojiUrl = (emoji: string) => {
  const codePoints = [...emoji]
    .map((char) => char.codePointAt(0)?.toString(16))
    .filter(Boolean)
    .join('-')
    .replace(/-fe0f/g, ''); // Remove variation selector
  return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${codePoints}.svg`;
};

const TwemojiImg = memo(({ emoji, size = 24 }: { emoji: string; size?: number }) => (
  <img
    src={getTwemojiUrl(emoji)}
    alt={emoji}
    width={size}
    height={size}
    loading="lazy"
    className="inline-block"
    style={{ width: size, height: size }}
    onError={(e) => {
      // Fallback to native emoji if Twemoji fails
      const target = e.target as HTMLImageElement;
      target.style.display = 'none';
      target.parentElement?.insertAdjacentHTML('beforeend', `<span style="font-size: ${size}px">${emoji}</span>`);
    }}
  />
));

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
}

const emojiCategories = {
  smileys: {
    label: "Смайлы и люди",
    emojis: ["😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃", "😉", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😙", "🥲", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🤐", "🤨", "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "😮‍💨", "🤥", "😌", "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢", "🤮", "🤧", "🥵", "🥶", "🥴", "😵", "🤯", "🤠", "🥳", "🥸", "😎", "🤓", "🧐", "😕", "😟", "🙁", "☹️", "😮", "😯", "😲", "😳", "🥺", "😦", "😧", "😨", "😰", "😥", "😢", "😭", "😱", "😖", "😣", "😞", "😓", "😩", "😫", "🥱"],
  },
  gestures: {
    label: "Жесты",
    emojis: ["👋", "🤚", "🖐", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✍️", "💅", "🤳", "💪", "🦾", "🦿", "🦵", "🦶", "👂", "🦻", "👃", "🧠", "🫀", "🫁", "🦷", "🦴", "👀", "👁", "👅", "👄", "💋"],
  },
  hearts: {
    label: "Сердечки",
    emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❤️‍🔥", "❤️‍🩹", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "☮️", "✝️", "☪️", "🕉", "☸️", "✡️", "🔯", "🕎", "☯️", "☦️", "🛐", "⛎", "♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"],
  },
  animals: {
    label: "Животные",
    emojis: ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐻‍❄️", "🐨", "🐯", "🦁", "🐮", "🐷", "🐽", "🐸", "🐵", "🙈", "🙉", "🙊", "🐒", "🐔", "🐧", "🐦", "🐤", "🐣", "🐥", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝", "🪱", "🐛", "🦋", "🐌", "🐞", "🐜", "🪰", "🪲", "🪳", "🦟", "🦗", "🕷", "🕸", "🦂", "🐢", "🐍", "🦎", "🦖", "🦕", "🐙", "🦑", "🦐", "🦞", "🦀", "🐡", "🐠", "🐟", "🐬", "🐳", "🐋", "🦈", "🐊", "🐅", "🐆", "🦓", "🦍", "🦧", "🦣", "🐘", "🦛", "🦏", "🐪", "🐫", "🦒", "🦘", "🦬", "🐃", "🐂", "🐄", "🐎", "🐖", "🐏", "🐑", "🦙", "🐐", "🦌", "🐕", "🐩", "🦮", "🐕‍🦺", "🐈", "🐈‍⬛", "🪶", "🐓", "🦃", "🦤", "🦚", "🦜", "🦢", "🦩", "🕊", "🐇", "🦝", "🦨", "🦡", "🦫", "🦦", "🦥", "🐁", "🐀", "🐿", "🦔"],
  },
  food: {
    label: "Еда",
    emojis: ["🍏", "🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍈", "🍒", "🍑", "🥭", "🍍", "🥥", "🥝", "🍅", "🍆", "🥑", "🥦", "🥬", "🥒", "🌶", "🫑", "🌽", "🥕", "🫒", "🧄", "🧅", "🥔", "🍠", "🥐", "🥯", "🍞", "🥖", "🥨", "🧀", "🥚", "🍳", "🧈", "🥞", "🧇", "🥓", "🥩", "🍗", "🍖", "🦴", "🌭", "🍔", "🍟", "🍕", "🫓", "🥪", "🥙", "🧆", "🌮", "🌯", "🫔", "🥗", "🥘", "🫕", "🥫", "🍝", "🍜", "🍲", "🍛", "🍣", "🍱", "🥟", "🦪", "🍤", "🍙", "🍚", "🍘", "🍥", "🥠", "🥮", "🍢", "🍡", "🍧", "🍨", "🍦", "🥧", "🧁", "🍰", "🎂", "🍮", "🍭", "🍬", "🍫", "🍿", "🍩", "🍪", "🌰", "🥜", "🍯", "🥛", "🍼", "🫖", "☕", "🍵", "🧃", "🥤", "🧋", "🍶", "🍺", "🍻", "🥂", "🍷", "🥃", "🍸", "🍹", "🧉", "🍾", "🧊"],
  },
  travel: {
    label: "Путешествия",
    emojis: ["🚗", "🚕", "🚙", "🚌", "🚎", "🏎", "🚓", "🚑", "🚒", "🚐", "🛻", "🚚", "🚛", "🚜", "🦯", "🦽", "🦼", "🛴", "🚲", "🛵", "🏍", "🛺", "🚨", "🚔", "🚍", "🚘", "🚖", "🚡", "🚠", "🚟", "🚃", "🚋", "🚞", "🚝", "🚄", "🚅", "🚈", "🚂", "🚆", "🚇", "🚊", "🚉", "✈️", "🛫", "🛬", "🛩", "💺", "🛰", "🚀", "🛸", "🚁", "🛶", "⛵", "🚤", "🛥", "🛳", "⛴", "🚢", "⚓", "⛽", "🚧", "🚦", "🚥", "🚏", "🗺", "🗿", "🗽", "🗼", "🏰", "🏯", "🏟", "🎡", "🎢", "🎠", "⛲", "⛱", "🏖", "🏝", "🏜", "🌋", "⛰", "🏔", "🗻", "🏕", "⛺", "🏠", "🏡", "🏘", "🏚", "🏗", "🏭", "🏢", "🏬", "🏣", "🏤", "🏥", "🏦", "🏨", "🏪", "🏫", "🏩", "💒", "🏛", "⛪", "🕌", "🕍", "🛕", "🕋"],
  },
  objects: {
    label: "Предметы",
    emojis: ["⌚", "📱", "📲", "💻", "⌨️", "🖥", "🖨", "🖱", "🖲", "🕹", "🗜", "💽", "💾", "💿", "📀", "📼", "📷", "📸", "📹", "🎥", "📽", "🎞", "📞", "☎️", "📟", "📠", "📺", "📻", "🎙", "🎚", "🎛", "🧭", "⏱", "⏲", "⏰", "🕰", "⌛", "⏳", "📡", "🔋", "🔌", "💡", "🔦", "🕯", "🪔", "🧯", "🛢", "💸", "💵", "💴", "💶", "💷", "🪙", "💰", "💳", "💎", "⚖️", "🪜", "🧰", "🪛", "🔧", "🔨", "⚒", "🛠", "⛏", "🪚", "🔩", "⚙️", "🪤", "🧱", "⛓", "🧲", "🔫", "💣", "🧨", "🪓", "🔪", "🗡", "⚔️", "🛡", "🚬", "⚰️", "🪦", "⚱️", "🏺", "🔮", "📿", "🧿", "💈", "⚗️", "🔭", "🔬", "🕳", "🩹", "🩺", "💊", "💉", "🩸", "🧬", "🦠", "🧫", "🧪", "🌡", "🧹", "🪠", "🧺", "🧻", "🚽", "🚰", "🚿", "🛁", "🛀", "🧼", "🪥", "🪒", "🧽", "🪣", "🧴", "🛎", "🔑", "🗝", "🚪", "🪑", "🛋", "🛏", "🛌", "🧸", "🪆", "🖼", "🪞", "🪟", "🛍", "🛒", "🎁", "🎈", "🎏", "🎀", "🪄", "🪅", "🎊", "🎉", "🎎", "🏮", "🎐", "🧧"],
  },
  symbols: {
    label: "Символы",
    emojis: ["🔴", "🟠", "🟡", "🟢", "🔵", "🟣", "🟤", "⚫", "⚪", "🟥", "🟧", "🟨", "🟩", "🟦", "🟪", "🟫", "⬛", "⬜", "🔶", "🔷", "🔸", "🔹", "🔺", "🔻", "💠", "🔘", "🔳", "🔲", "🏁", "🚩", "🎌", "🏴", "🏳️", "🏳️‍🌈", "🏴‍☠️", "🇷🇺", "⭐", "🌟", "✨", "⚡", "💫", "🔥", "💥", "💦", "💨", "🌈", "☀️", "🌤", "⛅", "🌥", "☁️", "🌦", "🌧", "⛈", "🌩", "🌨", "❄️", "☃️", "⛄", "🌬", "💨", "💧", "💦", "☔", "☂️", "🌊", "🌫"],
  },
};

export const EmojiPicker = ({ onEmojiSelect }: EmojiPickerProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("smileys");

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji);
    setOpen(false);
    setSearchQuery("");
  };

  const filteredEmojis = useMemo(() => {
    if (!searchQuery) return null;
    
    const allEmojis: string[] = [];
    Object.values(emojiCategories).forEach(category => {
      allEmojis.push(...category.emojis);
    });
    
    return allEmojis;
  }, [searchQuery]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <Smile className="w-5 h-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] sm:w-[420px] p-0 bg-background z-[100]" align="end" side="top" sideOffset={16}>
        <div className="flex flex-col h-[240px] sm:h-[280px] max-h-[40vh]">
          {/* Search */}
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Поиск"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-muted/50 border-0"
              />
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="w-full grid grid-cols-8 rounded-none h-10 bg-muted/30">
              <TabsTrigger value="smileys" className="data-[state=active]:text-primary data-[state=active]:bg-background p-0">
                <TwemojiImg emoji="😊" size={20} />
              </TabsTrigger>
              <TabsTrigger value="gestures" className="data-[state=active]:text-primary data-[state=active]:bg-background p-0">
                <TwemojiImg emoji="👋" size={20} />
              </TabsTrigger>
              <TabsTrigger value="hearts" className="data-[state=active]:text-primary data-[state=active]:bg-background p-0">
                <TwemojiImg emoji="❤️" size={20} />
              </TabsTrigger>
              <TabsTrigger value="animals" className="data-[state=active]:text-primary data-[state=active]:bg-background p-0">
                <TwemojiImg emoji="🐶" size={20} />
              </TabsTrigger>
              <TabsTrigger value="food" className="data-[state=active]:text-primary data-[state=active]:bg-background p-0">
                <TwemojiImg emoji="🍕" size={20} />
              </TabsTrigger>
              <TabsTrigger value="travel" className="data-[state=active]:text-primary data-[state=active]:bg-background p-0">
                <TwemojiImg emoji="✈️" size={20} />
              </TabsTrigger>
              <TabsTrigger value="objects" className="data-[state=active]:text-primary data-[state=active]:bg-background p-0">
                <TwemojiImg emoji="💡" size={20} />
              </TabsTrigger>
              <TabsTrigger value="symbols" className="data-[state=active]:text-primary data-[state=active]:bg-background p-0">
                <TwemojiImg emoji="🔴" size={20} />
              </TabsTrigger>
            </TabsList>
            
            <ScrollArea className="flex-1">
              {searchQuery ? (
                <div className="p-3">
                  <div className="grid grid-cols-8 gap-1">
                    {filteredEmojis?.map((emoji, index) => (
                      <button
                        key={`${emoji}-${index}`}
                        onClick={() => handleEmojiClick(emoji)}
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-accent rounded-lg transition-all hover:scale-110"
                      >
                        <TwemojiImg emoji={emoji} size={24} />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {Object.entries(emojiCategories).map(([category, { label, emojis }]) => (
                    <TabsContent key={category} value={category} className="p-3 m-0 data-[state=inactive]:hidden">
                      <h3 className="text-xs font-medium text-muted-foreground mb-3">{label}</h3>
                      <div className="grid grid-cols-8 gap-1">
                        {emojis.map((emoji, index) => (
                          <button
                            key={`${emoji}-${index}`}
                            onClick={() => handleEmojiClick(emoji)}
                            className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-accent rounded-lg transition-all hover:scale-110"
                          >
                            <TwemojiImg emoji={emoji} size={24} />
                          </button>
                        ))}
                      </div>
                    </TabsContent>
                  ))}
                </>
              )}
            </ScrollArea>
          </Tabs>
        </div>
      </PopoverContent>
    </Popover>
  );
};
