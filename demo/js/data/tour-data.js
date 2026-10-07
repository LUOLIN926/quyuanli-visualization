/* ============================================================
   自动导览脚本：章节 / 镜头关键帧 / 字幕 / 声明式动作指令

   dur  标准档时长（秒，合计约 3:13）
   sDur 精简档时长（秒，合计约 2:38，落在作业 1-3 分钟要求内）；null = 精简档跳过

   act 动词（由 tour.js 解析分发）：
     explode:t            爆炸进度 0~1
     depth:t              耕深 0~1
     turn:a               犁盘转角（度）
     soil:t|play|stop     翻土土垡进度 / 循环
     turnplay:1           整犁回转演示
     arrows:0|1           力示意箭头
     beam:curve|straight  曲辕 / 直辕对比
     lever:1|0            犁梢杠杆演示
     mode:x               切换界面模式
     focus:id             高亮部件（null 取消）
     labels:all|key       标注显隐
     step:n               耕作流程第 n 步
   ============================================================ */
(function () {
  "use strict";

  window.QYL = window.QYL || {};

  var V = {
    iso: { p: [2.35, 1.72, 2.62], t: [0.18, 0.42, 0] },
    isoFar: { p: [3.1, 2.15, 3.3], t: [0.18, 0.42, 0] },
    side: { p: [0.22, 0.78, 3.05], t: [0.22, 0.4, 0] },
    sideLow: { p: [0.35, 0.5, 2.75], t: [0.3, 0.24, 0] },
    rear: { p: [-2.35, 1.35, 2.15], t: [-0.25, 0.45, 0] },
    share: { p: [1.42, 0.82, 1.52], t: [0.44, 0.13, 0.04] },
    wall: { p: [1.12, 0.92, 1.36], t: [0.22, 0.27, 0.08] },
    ping: { p: [0.82, 1.08, 1.5], t: [-0.06, 0.5, 0] },
    pan: { p: [2.55, 1.02, 1.5], t: [1.36, 0.3, 0] },
    handle: { p: [-1.95, 1.18, 1.72], t: [-0.86, 0.56, 0] },
    top: { p: [2.1, 2.55, 2.7], t: [0.15, 0.55, 0.12] },
    title: { p: [3.4, 1.62, 3.4], t: [0.15, 0.42, 0] },
    soil: { p: [1.75, 1.05, 1.95], t: [0.32, 0.22, 0.06] },
  };

  QYL.TOUR = [
    /* ---- 0 开场 ---- */
    { ch: "序", dur: 5, sDur: 3, cam: V.title, text: "曲辕犁 —— 唐代江东犁结构可视化" },
    { ch: "序", dur: 5, sDur: 4, cam: V.iso, text: "一犁一牛，深耕江南水田一千二百年。" },

    /* ---- 1 背景 / 地位 / 价值 ---- */
    {
      ch: "壹 · 时代背景",
      dur: 6,
      sDur: 5,
      cam: V.side,
      text: "唐代江南辟为全国粮仓，水田地块狭小、土质黏软。",
    },
    {
      ch: "壹 · 时代背景",
      dur: 6,
      sDur: 6,
      cam: V.rear,
      text: "本模型用于观察曲辕犁的构件关系，历史形制和使用方式仍需结合文献与实物理解。",
    },
    {
      ch: "贰 · 历史地位",
      dur: 6,
      sDur: 6,
      cam: V.iso,
      text: "晚唐陆龟蒙《耒耜经》详录江东耕犁十一部件 —— 世界最早的耕犁专著。",
    },
    {
      ch: "贰 · 历史地位",
      dur: 5,
      sDur: 5,
      cam: V.isoFar,
      text: "曲辕、犁盘与调深构件共同构成可操纵的耕犁结构；此处展示简化教学模型。",
    },
    {
      ch: "叁 · 科学价值",
      dur: 5,
      sDur: 5,
      cam: V.top,
      text: "其一，曲辕形态：弯曲主梁连接前端与后部木架，可观察装配关系。",
      act: "arrows:1",
    },
    {
      ch: "叁 · 科学价值",
      dur: 5,
      sDur: 5,
      cam: V.ping,
      text: "其二，深浅调节：犁评进退与犁箭、犁辕联动；数值为示意读数。",
      act: "depth:0.15",
    },
    {
      ch: "叁 · 科学价值",
      dur: 5,
      sDur: 5,
      cam: V.pan,
      text: "其三，牵引偏转：犁盘连接可相对犁辕调整方向。",
      act: "turn:32",
    },
    {
      ch: "叁 · 科学价值",
      dur: 6,
      sDur: 6,
      cam: V.wall,
      text: "其四，曲面翻土：犁壁为空间曲面，切、抬、翻一次完成。",
      act: "soil:play",
    },
    {
      ch: "叁 · 科学价值",
      dur: 4,
      sDur: null,
      cam: V.wall,
      text: "曲面导流，化平动为转动。",
      act: "soil:stop",
    },

    /* ---- 2 部件拆解 ---- */
    {
      ch: "肆 · 部件拆解",
      dur: 5,
      sDur: 4,
      cam: V.top,
      text: "十一部件，各司其职。先看整体拆解。",
      act: "mode:explode|explode:0|labels:all|turn:0|depth:0.5|soil:stop",
    },
    {
      ch: "肆 · 部件拆解",
      dur: 6,
      sDur: 5,
      cam: V.top,
      text: "牵引系 —— 曲轭、耕索承畜力，犁辕传导于犁体。",
      act: "explode:0.85|focus:beam",
    },
    {
      ch: "肆 · 部件拆解",
      dur: 5,
      sDur: 5,
      cam: V.pan,
      text: "转向系 —— 犁盘绕销轴可转，是回转灵活的机关。",
      act: "focus:pan",
    },
    {
      ch: "肆 · 部件拆解",
      dur: 5,
      sDur: 5,
      cam: V.ping,
      text: "调节系 —— 犁箭为标尺，犁评为滑块，犁建为锁销。",
      act: "focus:ping",
    },
    {
      ch: "肆 · 部件拆解",
      dur: 6,
      sDur: 6,
      cam: V.share,
      text: "工作系 —— 犁铲起土，犁壁翻土，犁床承载，压铲策额紧固防护。",
      act: "focus:share",
    },
    {
      ch: "肆 · 部件拆解",
      dur: 5,
      sDur: 5,
      cam: V.handle,
      text: "操纵系 —— 犁梢在手，深浅宽窄、行止转向皆决于此。",
      act: "focus:handle",
    },

    /* ---- 3 力学原理 ---- */
    {
      ch: "伍 · 力学原理",
      dur: 5,
      sDur: null,
      cam: V.iso,
      text: "再看几组关键的力学与机械逻辑。",
      act: "mode:mechanics|explode:0|labels:key|focus:null",
    },
    {
      ch: "伍 · 曲辕",
      dur: 7,
      sDur: null,
      cam: V.side,
      text: "曲辕连接前端与后部木架；此处观察弧形轮廓及装配关系。",
      act: "beam:curve",
    },
    {
      ch: "伍 · 曲辕",
      dur: 7,
      sDur: 6,
      cam: V.side,
      text: "同尺寸直／曲辕形态对照：端点保持相同，不用于比较历史整机长度或牵引效率。",
      act: "mode:mechanics|explode:0|labels:key|focus:null|beam:straight",
    },
    {
      ch: "伍 · 调深",
      dur: 4,
      sDur: null,
      cam: V.ping,
      text: "调深机构：犁评推进 ——",
      act: "beam:curve|depth:0.15",
    },
    {
      ch: "伍 · 调深",
      dur: 6,
      sDur: 6,
      cam: V.ping,
      text: "「进之则箭下，入土也深」：楔面抬辕压箭，犁头下探。",
      act: "beam:curve|depth:0.95",
    },
    {
      ch: "伍 · 调深",
      dur: 6,
      sDur: 5,
      cam: V.share,
      text: "「退之则箭上，入土也浅」：犁评后退，犁头抬起。",
      act: "depth:0.12",
    },
    {
      ch: "伍 · 转向",
      dur: 6,
      sDur: 5,
      cam: V.pan,
      text: "转向机构：犁盘绕销轴转动 ±35°，畜力方向与犁身解耦。",
      act: "depth:0.5|turn:32",
    },
    {
      ch: "伍 · 转向",
      dur: 5,
      sDur: 5,
      cam: V.iso,
      text: "整犁回转展示方向调整，动画轨迹不代表实际田间最小回转半径。",
      act: "turnplay:1|turn:0",
    },
    {
      ch: "伍 · 翻土",
      dur: 4,
      sDur: null,
      cam: V.share,
      text: "翻土力学：犁铲楔形切入，牵引力分解 ——",
      act: "arrows:1|soil:play",
    },
    {
      ch: "伍 · 翻土",
      dur: 6,
      sDur: 6,
      cam: V.wall,
      text: "铲刃切入土层，犁面推力引导土块沿犁壁抬升、向侧方翻覆。",
      act: "arrows:1|soil:play",
    },
    {
      ch: "伍 · 翻土",
      dur: 6,
      sDur: 6,
      cam: V.soil,
      text: "翻转动画展示曲面引导的趋势，真实翻转角度与效果依赖耕作条件。",
      act: "soil:stop",
    },
    {
      ch: "伍 · 犁梢",
      dur: 5,
      sDur: 5,
      cam: V.handle,
      text: "犁梢杠杆：上抬下压调深浅，左右推拉控宽窄。",
      act: "lever:1|arrows:0",
    },

    /* ---- 4 耕作流程 ---- */
    {
      ch: "陆 · 耕作流程",
      dur: 4,
      sDur: null,
      cam: V.sideLow,
      text: "最后看完整耕作流程：牵引 → 入土 → 起土 → 翻土 → 回转。",
      act: "mode:flow|labels:key|focus:null|arrows:1|lever:0",
    },
    {
      ch: "陆 · 流程一",
      dur: 5,
      sDur: 5,
      cam: V.sideLow,
      text: "一 · 牵引前行：牛犋经曲轭、耕索、犁盘，将力传入犁辕。",
      act: "mode:flow|labels:key|focus:null|arrows:1|lever:0|step:0",
    },
    {
      ch: "陆 · 流程二",
      dur: 5,
      sDur: 5,
      cam: V.share,
      text: "二 · 犁铲入土：薄刃切入，渐厚铲面推起土块。",
      act: "step:1",
    },
    {
      ch: "陆 · 流程三",
      dur: 5,
      sDur: 4,
      cam: V.soil,
      text: "三 · 起土：垡片自沟底剥离，顺铲面向犁壁过渡。",
      act: "step:2",
    },
    {
      ch: "陆 · 流程四",
      dur: 6,
      sDur: 5,
      cam: V.wall,
      text: "四 · 翻土：垡片沿犁壁曲面滑升翻转，扣覆于前垡之上。",
      act: "step:3",
    },
    {
      ch: "陆 · 流程五",
      dur: 6,
      sDur: 6,
      cam: V.iso,
      text: "五 · 回转掉头：前端连接偏转，整犁调整方向；此为过程示意。",
      act: "step:4",
    },

    /* ---- 5 收尾 ---- */
    {
      ch: "结",
      dur: 5,
      sDur: 5,
      cam: V.isoFar,
      text: "一犁之中，藏着曲面、杠杆、楔与转动副 —— 古人以最简之材，解最切之需。",
      act: "mode:overview|arrows:0|turn:0|depth:0.5|labels:key|lever:0",
    },
    {
      ch: "结",
      dur: 4,
      sDur: 4,
      cam: V.title,
      text: "曲辕犁 · 结构可视化 —— AI 辅助创作",
    },
  ];
})();
