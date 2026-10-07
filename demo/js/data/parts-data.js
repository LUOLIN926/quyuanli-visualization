/* ============================================================
   部件元数据：名称 / 功能 / 释义 / 《耒耜经》引文 / 力学要点 / 爆炸向量
   ============================================================ */
(function () {
  "use strict";

  window.QYL = window.QYL || {};

  /**
   * explodeDir  : 爆炸位移方向（单位向量，plowRoot 空间）
   * explodeDist : 爆炸位移距离（米）
   * anchor      : 标注锚点（部件 group 局部坐标）
   * labelSide   : 标签引线出线方向 "left" | "right" | "up" | "down"
   */
  QYL.PARTS = [
    {
      id: "beam",
      name: "犁辕",
      alias: "别名 · 辕",
      func: "承 引",
      group: "牵引系",
      desc:
        "整犁的主梁，自前端犁盘向后上方拱起，再斜落至犁梢。唐代江东犁改汉代长直辕为<b>短曲辕</b>，是这次变革最关键的一笔。",
      quote: "辕修九尺，梢得其半。",
      quoteSrc: "《耒耜经》",
      mech:
        "主梁把牵引连接与后部木架连接起来。曲率改变外形与空间布置；应力、省力程度和重心需要材料、载荷及尺寸数据，不能由本示意模型直接得出。",
      explodeDir: [0, 1, 0],
      explodeDist: 0.62,
      anchor: [0.15, 0.8, 0],
      labelSide: "up",
    },
    {
      id: "pan",
      name: "犁盘",
      alias: "别名 · 犁槃",
      func: "转 向",
      group: "转向系",
      desc:
        "犁辕前端的圆盘形构件，可绕竖直销轴自由转动，其上接曲轭与耕索。它是曲辕犁「回转灵活」的机关所在。",
      quote: "犁槃，形圆而曲，所以转也。",
      quoteSrc: "《耒耜经》释意",
      mech:
        "牵引连接可相对主梁偏转，便于调整牵引方向。±35° 为动画观察范围，不是历史构件的实测限位。",
      explodeDir: [1, 0, 0],
      explodeDist: 0.85,
      anchor: [1.28, 0.3, 0],
      labelSide: "right",
    },
    {
      id: "yoke",
      name: "曲轭",
      alias: "别名 · 轭",
      func: "系 畜",
      group: "牵引系",
      desc:
        "前端弯月形的横轭，两端设挂索环，通过耕索与牛犋相连。其弧形贴合牛颈，受力均匀而不伤畜。",
      quote: "",
      quoteSrc: "",
      mech:
        "弧形截面将集中载荷分散到牛颈较大面积上；牵引力经耕索、曲轭传入犁盘，再由犁辕导向犁底，形成完整的传力路径。",
      explodeDir: [1, 0.1, 0],
      explodeDist: 1.18,
      anchor: [1.62, 0.3, 0],
      labelSide: "right",
    },
    {
      id: "rope",
      name: "耕索",
      alias: "别名 · 牵绳",
      func: "传 力",
      group: "牵引系",
      desc:
        "连接曲轭与犁盘的绳索，是畜力进入犁体的第一道环节。演示中以动态箭头表示牛的牵引力。",
      quote: "",
      quoteSrc: "",
      mech:
        "柔性传力：绳索只承拉不承压，使牵引方向可随牛的步伐小幅摆动而不产生附加弯矩，起缓冲与对中作用。",
      explodeDir: [1, -0.08, 0],
      explodeDist: 1.5,
      anchor: [1.5, 0.36, 0.1],
      labelSide: "up",
    },
    {
      id: "handle",
      name: "犁梢",
      alias: "别名 · 梢",
      func: "操 纵",
      group: "操纵系",
      desc:
        "犁床后端上扬的长把手，末端装 T 形横杆，供农人握持。它是人机之间的唯一接口。",
      quote: "梢得其半，所以执而耕也。",
      quoteSrc: "《耒耜经》释意",
      mech:
        "握持犁梢可操纵整犁的倾斜与方向。模型保留木架连接，以整体微倾表达操纵动作，不把犁梢画成可自由摆动的独立杆件。",
      explodeDir: [-0.82, 0.3, 0],
      explodeDist: 0.72,
      anchor: [-0.92, 0.82, 0],
      labelSide: "left",
    },
    {
      id: "arrow",
      name: "犁箭",
      alias: "别名 · 箭",
      func: "调 深",
      group: "调节系",
      desc:
        "穿接犁辕与犁床的竖直立柱，上端与犁评、犁建配合调节定位。它是调深机构的「标尺」。",
      quote: "",
      quoteSrc: "",
      mech:
        "下端接犁床，上端穿过犁辕调节区域。动画联动主梁角度与箭身外露长度，保持下端连接；该运动关系为教学简化。",
      explodeDir: [0, 1, 0.12],
      explodeDist: 0.3,
      anchor: [-0.06, 0.66, 0],
      labelSide: "up",
    },
    {
      id: "ping",
      name: "犁评",
      alias: "别名 · 评",
      func: "定 深",
      group: "调节系",
      desc:
        "骑在犁箭上的楔形滑块，可沿箭身进退，斜面顶住犁辕底面。模型以进退滑块展示深浅调节。",
      quote: "进之则箭下，入土也深；退之则箭上，入土也浅。",
      quoteSrc: "《耒耜经》",
      mech:
        "犁评进退与犁辕、犁箭的位置变化配合，用于调整深浅。本模型保留该关联，采用简化导向关系；滑块读数为示意值。",
      explodeDir: [0.12, 1, 0],
      explodeDist: 0.98,
      anchor: [-0.06, 0.5, 0.06],
      labelSide: "right",
    },
    {
      id: "jian",
      name: "犁建",
      alias: "别名 · 建",
      func: "锁 定",
      group: "调节系",
      desc:
        "横向穿入犁箭的销钉，把犁评锁止在选定位置，防止耕作颠簸中自行滑移。",
      quote: "",
      quoteSrc: "",
      mech:
        "销—孔配合提供可靠的摩擦锁止，是古代机械中最朴素也最有效的「定位」方式，调深后一插即定。",
      explodeDir: [0.3, 1, 0],
      explodeDist: 1.2,
      anchor: [-0.06, 0.62, 0.1],
      labelSide: "right",
    },
    {
      id: "bed",
      name: "犁床",
      alias: "别名 · 犁底",
      func: "承 载",
      group: "工作系",
      desc:
        "贴地的水平底梁，前端装犁铲、上承犁壁，后端接犁梢，是犁体的「基座」。",
      quote: "",
      quoteSrc: "",
      mech:
        "细长梁结构以最少的材料取得抗弯刚度；它把犁壁传来的侧向土压力均匀传给犁辕与犁梢，并保持犁头在沟底的稳定姿态。",
      explodeDir: [0, -1, 0],
      explodeDist: 0.36,
      anchor: [-0.3, 0.02, 0],
      labelSide: "down",
    },
    {
      id: "ce",
      name: "策额",
      alias: "别名 · 额",
      func: "护 壁",
      group: "工作系",
      desc:
        "位于底梁上方的支撑木件，与前端支撑共同形成犁壁后方的支承结构。参考图的细节不完全一致，此处采用简化木架。",
      quote: "",
      quoteSrc: "",
      mech:
        "支撑木架把工作部件与后部结构连接起来；此处用于说明支承位置，不推算承载能力。",
      explodeDir: [-0.18, 0.55, 0.82],
      explodeDist: 0.82,
      anchor: [0.16, 0.32, 0.16],
      labelSide: "up",
    },
    {
      id: "share",
      name: "犁铲",
      alias: "别名 · 犁镵 · 犁铧",
      func: "起 土",
      group: "工作系",
      desc:
        "铁制的楔形刃具，水平切入土层，将垡片自沟底掀起。《耒耜经》所谓「起其墝者镵也」。",
      quote: "起其墝者镵也，覆其垡者壁也。",
      quoteSrc: "《耒耜经》",
      mech:
        "<b>薄刃与渐厚铲面</b>用于切入并抬起土层。犁面作用于土块的力与土块作用于犁的反力方向相反，不能把它们与外部牵引力混为一组分力。",
      explodeDir: [0.3, -0.12, 0.95],
      explodeDist: 0.95,
      anchor: [0.5, 0.06, 0.06],
      labelSide: "down",
    },
    {
      id: "wall",
      name: "犁壁",
      alias: "别名 · 犁镜",
      func: "翻 土",
      group: "工作系",
      desc:
        "铁制的弯曲翻土面，接在犁铲之后。垡片沿其曲面滑升、扭转、翻转，扣在前一垡之上。",
      quote: "覆其垡者壁也。",
      quoteSrc: "《耒耜经》",
      mech:
        "<b>曲面引导翻覆</b>：土块沿犁壁抬升并向侧方翻转。模型展示运动趋势；实际翻转角度和土壤效果依赖土质、速度及耕深。",
      explodeDir: [0.12, 0.06, 1.25],
      explodeDist: 1.22,
      anchor: [0.2, 0.3, 0.14],
      labelSide: "right",
    },
    {
      id: "press",
      name: "压铲",
      alias: "别名 · 压镵",
      func: "固 头",
      group: "工作系",
      desc:
        "位于犁铲根部与犁床结合处的固定构件。本模型用顶部夹持块及两侧夹片简化表示安装关系。",
      quote: "",
      quoteSrc: "",
      mech:
        "夹持构件限制铲根相对犁床的位移，并将工作载荷传入底梁。顶部位于犁壁下方，留出曲面翻土的空间；具体材料和连接形式为教学简化。",
      explodeDir: [0, 0.42, 1.02],
      explodeDist: 1.05,
      anchor: [0.34, 0.16, 0.1],
      labelSide: "up",
    },
  ];

  /** 分组顺序（拆解讲解用） */
  QYL.PART_GROUPS = [
    { key: "牵引系", label: "牵引系", parts: ["yoke", "rope", "beam"] },
    { key: "转向系", label: "转向系", parts: ["pan"] },
    { key: "调节系", label: "调节系", parts: ["arrow", "ping", "jian"] },
    { key: "工作系", label: "工作系", parts: ["bed", "share", "wall", "press", "ce"] },
    { key: "操纵系", label: "操纵系", parts: ["handle"] },
  ];

  QYL.getPart = function (id) {
    for (var i = 0; i < QYL.PARTS.length; i++) {
      if (QYL.PARTS[i].id === id) return QYL.PARTS[i];
    }
    return null;
  };
})();
