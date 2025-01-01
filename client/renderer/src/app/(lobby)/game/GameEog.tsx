import championList from '@renderer/public/assets/champions.json';
import itemsList from '@renderer/public/assets/items.json';
import summonerSpellsList from '@renderer/public/assets/summoner-spells.json';

export const GameEogChampion = (props: {
  championId: number;
  name: string;
  level: number;
}) => {
  const champion = championList.find(c => c.id === props.championId);
  const portaitURL = champion?.portraitURL || "";

  return (
    <div className="flex items-center gap-2">
      <div className="font-bold">{props.level}</div>
      <img title={champion?.name} src={portaitURL} className="w-8 h-8" />

      <div>{props.name}</div>
    </div>
  )
}

export const GameEogSpellAndItems = (props: {
  spells: number[];
  items: number[];
}) => {
  const spells = props.spells.map(i => summonerSpellsList.find(it => it.id === i));
  const items = props.items.map(i => itemsList.find(it => it.id === i));


  return (
    <div className="flex gap-1">

      {items.map((item, index) => (
        <img title={item?.name} src={item?.iconURL} key={index} className="w-8 h-8 bg-slate-800" />
      ))}

      <div className="w-4"></div>

      {spells.map((spell, index) => (
        <img title={spell?.name} src={spell?.iconURL} key={'spell' + index} className="w-8 h-8 bg-slate-800" />
      ))}

    </div>
  );
}
