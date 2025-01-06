
export function platformIdToDisplayName(platformId: string) {
  switch (platformId) {
    // tencent server
    case "HN1": return "艾欧尼亚";
    // case "HN2": return "祖安";
    // case "HN3": return "诺克萨斯";
    // case "HN4": return "班德尔城";
    // case "HN5": return "皮尔特沃夫";
    // case "HN6": return "战争学院";
    // case "HN7": return "巨神峰";
    // case "HN8": return "雷瑟守备";
    // case "HN9": return "裁决之地";
    case "HN10": return "黑色玫瑰";
    // case "HN11": return "暗影岛";
    // case "HN12": return "钢铁烈阳";
    // case "HN13": return "水晶之痕";
    // case "HN14": return "均衡教派";
    // case "HN15": return "影流";
    // case "HN16": return "守望之海";
    // case "HN17": return "征服之海";
    // case "HN18": return "卡拉曼达";
    // case "HN19": return "皮城警备";
    // case "WT1": return "比尔吉沃特";
    // case "WT2": return "德玛西亚";
    // case "WT3": return "弗雷尔卓德";
    // case "WT4": return "无畏先锋";
    // case "WT5": return "恕瑞玛";
    // case "WT6": return "扭曲丛林";
    // case "WT7": return "巨龙之巢";
    // case "EDU1": return "教育网专区";

    // tencent union server
    case "NJ100": return "联盟一区（合区）";
    case "GZ100": return "联盟二区（合区）";
    case "CQ100": return "联盟三区（合区）";
    case "TJ100": return "联盟四区（合区）";
    case "TJ101": return "联盟五区（合区）";

    // riot server
    case "BR1": return "巴西";
    case "EUN1": return "欧洲东北";
    case "EUW1": return "欧洲西北";
    case "JP1": return "日本";
    case "KR": return "韩国";
    case "LA1": return "拉丁美洲北";
    case "LA2": return "拉丁美洲南";
    case "NA1": return "北美";
    case "OC1": return "大洋洲";
    case "TR1": return "土耳其";
    case "RU": return "俄罗斯";
    case "PBE1": return "美测服";
    case "": return "";
    default: return platformId;
  }
}