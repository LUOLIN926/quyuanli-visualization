# 曲辕犁结构可视化

一个以唐代江东犁（曲辕犁）为对象的交互式三维教学演示，包含器物总览、部件拆解、力学原理和耕作流程。

**在线演示：** <https://luolin926.github.io/quyuanli-visualization/>

## 本机运行

需要 Python 3。进入项目目录后启动静态文件服务器：

```bash
python3 -m http.server 8000
```

然后打开 <http://localhost:8000/>。也可以直接打开 `demo/index.html`。

## 操作方式

- 拖拽：环绕观察犁身
- 滚轮：推近或拉远
- 点选部件：高亮并查看说明
- `H`：净屏模式；空格：播放或暂停

演示中的几何、尺寸读数和力箭头用于观察结构与机制，不代表实物尺寸复原或实测力学数据。历史描述以页面所列文献为线索。

## 许可

项目自有源码与说明采用 Apache License 2.0，详见 [LICENSE](LICENSE)。随项目提供的 Three.js 与 OrbitControls 使用 MIT 许可，详见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
