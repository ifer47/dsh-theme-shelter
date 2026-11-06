<div align="center">

<img src="assets/logo.svg" width="76" height="76" alt="檐下" />

# 檐下 · Shelter

<p><a href="./README.md">English</a></p>

<p>
  <a href="https://github.com/ifer47/dsh-theme-shelter/releases"><img src="https://img.shields.io/github/v/tag/ifer47/dsh-theme-shelter?label=version&color=blue" alt="Version" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="License" /></a>
  <a href="https://github.com/ifer47/dsh-theme-shelter/stargazers"><img src="https://img.shields.io/github/stars/ifer47/dsh-theme-shelter?style=social" alt="Stars" /></a>
  <img src="https://img.shields.io/badge/platform-Web%20%2B%20Desktop-6b7280" alt="Platform" />
  <img src="https://img.shields.io/badge/DSH-plugin-8b5cf6" alt="DSH plugin" />
</p>

<p><strong>给 DeepSeek Harness 的一层天气</strong>：雨、雪、炉火，配真实录音与夜间模式。</p>

</div>

<p align="center">
  <img src="docs/preview-rain-light.jpg" width="860" alt="檐下 · 雨（浅色）" />
</p>

<p align="center">
  <img src="docs/preview-rain-night.jpg" width="420" alt="檐下 · 夜雨" />
  <img src="docs/preview-snow.jpg" width="420" alt="檐下 · 雪" />
</p>

<p align="center">
  <img src="docs/preview-fire.jpg" width="420" alt="檐下 · 炉火" />
  <img src="docs/preview-panel.jpg" width="420" alt="檐下 · 面板" />
</p>

**目录：** [安装](#安装) · [使用](#使用) · [声音](#声音) · [工作原理](#工作原理) · [本地开发](#本地开发) · [素材来源](#素材来源)

## 它是什么

檐下是一层很薄的天气。下雨时玻璃上会落水珠、拖出雨丝；下雪时楼外安静地飘；生火时屏幕底部有暖光和上浮的火星。

它不改 DSH 的任何功能，只改你工作时坐在里面的那点空气。入口只有右下角一颗 28px 的小按钮，其余时间它只是安静地下雨。

## 三种场景

| 场景 | 画面 | 配色 |
| --- | --- | --- |
| **雨** | 锥形雨丝（尾巴淡、头部略亮，没有大亮珠、不拖长尾）、一层大小不一的水珠、落底才炸开的小涟漪 | 冷蓝灰，暗部压到深海蓝 |
| **雪** | 缓慢飘落的雪片、近处带六角雪晶、偶尔的闪光、底边积雪 | 更冷更白，强调色偏冰蓝 |
| **火** | 底部暖光与脉动、上浮的火星、迸溅的火星子、缓慢上升的烟 | 暖中性：米白背景、深棕文字、琥珀强调 |

语义色（错误红 / 成功绿 / 警告黄）三种场景都不动，红还是红。

## 安装

需要 DeepSeek Harness（桌面端或 Web 端均可）。

```powershell
cd "$env:USERPROFILE\.dsh\profiles\desktop"
pnpm add "C:\path\to\dsh-theme-shelter"
```

再把它加到 profile `package.json` 的 `dsh.profile.bundles` 末尾，然后刷新窗口（<kbd>Ctrl</kbd>+<kbd>R</kbd>）或重启 DSH。

也可以手动挂载——在 `~/.dsh/profiles/desktop/cordis.patch.yml` 末尾追加：

```yaml
- insert:
    - id: theme-shelter
      name: dsh-theme-shelter
```

## 使用

点右下角的小按钮打开面板：

| 控件 | 作用 |
| --- | --- |
| 场景 | 雨 / 雪 / 火 / 关（关 = 撤掉配色和画面） |
| 强度 | 轻 / 中 / 暴：粒子数、雨丝长度、积雪高度、火势 |
| 配色 | 调色板总开关；关掉只留动画，界面回到 DSH 默认色 |
| 闪电 | 只在雨天有效，7–22 秒随机一次，配雷声 |
| 声音 | 真实录音；浏览器要求先有一次点击/按键才放行 |
| 夜间 | 强制深色配色 + 月光覆层 |

设置存在 `localStorage["dsh-theme-shelter/v2"]`，刷新、重启都保留。

控制台也可以直接调：

```js
__dshWeather.setScene("fire")     // rain · snow · fire · none
__dshWeather.setIntensity(2)      // 1 轻 / 2 中 / 3 暴
__dshWeather.setPalette(false)    // 只用动画，不改配色
__dshWeather.setSound(true)
__dshWeather.setNight(false)
__dshWeather.reset()
```

## 声音

三段真实录音（`audio/`，约 7.7 MB）。宿主半边注册只读路由 `/dsh-theme-shelter/audio/*` 交给浏览器，支持 `Range`（206）、`HEAD`、一年缓存，外站 `Origin` 返回 403。雪天复用雨声并降音量。

## 工作原理

- **配色**：`ctx.theme.overrideTokens()` 覆盖 47 个 `--dsw-alias-*` 令牌，只碰表面、文字、边框、代码块、滚动条；按钮填充、品牌色、链接、焦点环一律不动。
- **画面**：一块固定全屏 Canvas，雨/雪/火各自一套粒子系统，全部用预渲染精灵绘制。
- **音频**：宿主只读路由 + 客户端 `<audio>`，切换场景时淡出并释放。
- **开销**：粒子数按视口面积计算并夹上限，DPR 上限 2，切后台停表，`prefers-reduced-motion` 只画一帧静止画面。

## 本地开发

`preview/preview.html` 是一个不依赖 DSH 的预览壳：伪造模块加载器和 `ctx.theme`，双击即可看三种场景、夜间与面板。

profile 里是 `link:` 依赖，改完 `client/client.js` 只需重启 DSH。

## 已知限制

- 夜间模式不写你的外观偏好，所以设置页仍显示你原来选的浅色/深色；
- 覆盖层叠在整个窗口上，模态框、菜单上面也会落雨落雪（透明度很低）；
- 不改产品图标（那需要注册独立主题）；
- 音频来自 Pixabay（见素材来源），引用时建议保留来源。

## 素材来源

声音素材来自 **[Pixabay](https://pixabay.com/)**，按 [Pixabay Content License](https://pixabay.com/service/license-summary/) 免费使用：可用于商业与非商业作品、无需署名，但不允许把素材**原样单独再分发**。这里是作为插件的一部分打包，属于「用于更大的作品」。

| 文件 | 用途 |
| --- | --- |
| `audio/rain.mp3` | 雨声循环（雪天复用，音量更低） |
| `audio/fire.mp3` | 炉火循环 |
| `audio/thunder.mp3` | 闪电后的一次性雷声 |

想换音色，直接放同名文件进 `audio/` 即可。

## License

MIT © ifer47
