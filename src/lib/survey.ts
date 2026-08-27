export const storeGroups: Record<string, string[]> = {
  "いいもの三瀬": ["いいもの三瀬"],
  "マックスバリュ": ["マックスバリュエクスプレス野芥店", "マックスバリュエクスプレス内野店", "マックスバリュエクスプレス二日市店", "マックスバリュ尼寺店", "マックスバリュ若楠店"],
  "にしてつストア": ["にしてつストア七隈店", "にしてつストア周船寺店", "にしてつストア有田店", "にしてつストア北茂安店", "にしてつストアレガネットマルシェ四箇田", "にしてつストアレガネット南長住", "にしてつストアレガネット飯倉"],
  "あんくる夢市場": ["あんくる夢市場久留米店", "あんくる夢市場鳥栖弥生が丘店"],
  "薬院バリュー": ["薬院バリュー"],
  "ハイマート": ["ハイマート福浜店"],
  "ミスターマックス": ["ミスターマックス篠栗店", "ミスターマックス土井店"],
  "アスタラビスタ": ["アスタラビスタ城島店", "アスタラビスタ下庄店", "アスタラビスタ大和店", "アスタラビスタ大川店", "アスタラビスタ柳川西店", "アスタラビスタ高田店"],
};

export function isValidStore(group: string, store: string) {
  return storeGroups[group]?.includes(store) ?? false;
}

export function normalizeBirthDate(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  const currentYear = new Date().getFullYear();
  if (year < 1900 || year > currentYear || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
