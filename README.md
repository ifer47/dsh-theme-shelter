<div align="center">

<img src="assets/logo.svg" width="76" height="76" alt="檐下 · Shelter" />

# 檐下 · Shelter

**Immersive weather for DeepSeek Harness** — rain, snow and hearth, with real recordings.
<br />
**给 DeepSeek Harness 的一层天气：雨、雪、炉火，配真实录音。**

<p>
  <a href="https://github.com/ifer47/dsh-theme-shelter/releases"><img src="https://img.shields.io/github/v/tag/ifer47/dsh-theme-shelter?label=version&color=blue" alt="Version" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="License" /></a>
  <a href="https://github.com/ifer47/dsh-theme-shelter/stargazers"><img src="https://img.shields.io/github/stars/ifer47/dsh-theme-shelter?style=social" alt="Stars" /></a>
  <img src="https://img.shields.io/badge/platform-Web%20%2B%20Desktop-6b7280" alt="Platform" />
  <img src="https://img.shields.io/badge/DSH-plugin-8b5cf6" alt="DSH plugin" />
</p>

<p><strong>Contents:</strong> <a href="#中文">中文</a> · <a href="#english">English</a> · <a href="#安装">安装</a> · <a href="#使用">使用</a> · <a href="#工作原理">工作原理</a> · <a href="#本地开发">本地开发</a></p>

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

---

## 中文

### 它是什么

檐下是一层很薄的天气。下雨时玻璃上会落水珠、拖出雨丝；下雪时楼外安静地飘；生火时屏幕底部有暖光和上浮的火星。

它不改 DSH 的任何功能，只改你工作时坐在里面的那点空气。入口只有右下角一颗 28px 的小按钮，其余时间它只是安静地下雨。

### 三种场景

| 场景 | 画面 | 配色 |
| --- | --- | --- |
| **雨** | 锥形雨丝（尾巴淡、头部略亮，没有大亮珠、不拖长尾）、一层大小不一的水珠、落底才炸开的小涟漪 | 冷蓝灰，暗部压到深海蓝 |
| **雪** | 缓慢飘落的雪片、近处带六角雪晶、偶尔的闪光、底边积雪 | 更冷更白，强调色偏冰蓝 |
| **火** | 底部暖光与脉动、上浮的火星、迸溅的火星子、缓慢上升的烟 | 暖中性：米白背景、深棕文字、琥珀强调 |

语义色（错误红 / 成功绿 / 警告黄）三种场景都不动，红还是红。

### 安装

需要 DeepSeek Harness（桌面端或 Web 端均可）。

**1. 用插件管理器（推荐）** — 让 agent 调 `plugin_manager` 的 `install_bundle`，`target` 传本目录绝对路径，或直接：

```powershell
cd "$env:USERPROFILE\.dsh\profiles\desktop"
pnpm add "C:\path\to\dsh-theme-shelter"
```

再把它加到 profile `package.json` 的 `dsh.profile.bundles` 末尾。

**2. 手动挂载** — 在 `~/.dsh/profiles/desktop/cordis.patch.yml` 末尾追加：

```yaml
- insert:
    - id: theme-shelter
      name: dsh-theme-shelter
```

装完刷新窗口（<kbd>Ctrl</kbd>+<kbd>R</kbd>）或重启 DSH 生效。

### 使用

点右下角小按钮打开面板：

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
__dshWeather.setScene("snow")     // rain · snow · fire · none
__dshWeather.setIntensity(3)      // 1 轻 / 2 中 / 3 暴
__dshWeather.setPalette(false)    // 只用动画，不改配色
__dshWeather.setSound(true)
__dshWeather.setNight(true)
__dshWeather.reset()
```

### 声音

三段真实录音（`audio/`，约 7.7 MB）：雨循环、火循环、雷一次性。宿主半边注册只读路由 `/dsh-theme-shelter/audio/*` 交给浏览器，支持 `Range`（206）、`HEAD`、一年缓存，外站 `Origin` 返回 403。雪天复用雨声并降音量。

### 夜间模式

勾上「夜间」后，给 `body` 加 DSH 自己的深色属性、整套令牌换成深色一份，再叠一层很淡的月光。退出时属性、`color-scheme`、令牌一起还回去。

### 工作原理

- **配色**：`ctx.theme.overrideTokens()` 覆盖 47 个 `--dsw-alias-*` 令牌，只碰表面、文字、边框、代码块、滚动条；按钮填充、品牌色、链接、焦点环一律不动。
- **画面**：一块固定全屏 Canvas，雨/雪/火各自一套粒子系统，全部用预渲染精灵绘制。
- **音频**：宿主只读路由 + 客户端 `<audio>`，切换场景时淡出并释放。
- **性能**：粒子数按视口面积计算并夹上限，DPR 上限 2，切后台停表，`prefers-reduced-motion` 只画一帧静止画面。

### 本地开发

`preview/preview.html` 是一个不依赖 DSH 的预览壳：伪造模块加载器和 `ctx.theme`，双击即可看三种场景、夜间与面板。

改完 `client/client.js`：profile 里是 `link:` 依赖，重启 DSH 即可；有 HMR 时替换文件可能自动重载。

### 已知限制

- 夜间模式不写你的外观偏好，所以设置页仍显示原来的浅色/深色；
- 覆盖层叠在整个窗口上，模态框、菜单上面也会落雨落雪（透明度很低）；
- 不改产品图标（那需要注册独立主题）；
- 音频来自 Pixabay（免费使用，见下方 Credits），引用时建议保留来源。

---

## English

### What it is

Shelter is a thin layer of weather over the DeepSeek Harness web GUI. Rain leaves beads on the glass; snow drifts slowly outside; a fire glows under the composer.

It changes nothing about how DSH works — only the air you sit in while working. The entry point is a 28 px button in the bottom-right corner; the rest of the time it just rains, quietly.

### Scenes

| Scene | What you see | Palette |
| --- | --- | --- |
| **Rain** | Tapered streaks (no head blobs, no long tails), a field of droplets, small ripples where drops land | Cool blue-grey, deep navy shadows |
| **Snow** | Slow flakes, six-armed crystals up close, occasional glints, a soft bank at the bottom | Colder and whiter, icy-blue accents |
| **Fire** | A warm pulse from below, rising embers, sparks, slow smoke | Warm neutrals, amber accents |

Semantic colors (error red, success green, warning amber) are untouched in every scene.

### Install

Requires DeepSeek Harness (desktop or web).

```powershell
cd "$env:USERPROFILE\.dsh\profiles\desktop"
pnpm add "C:\path\to\dsh-theme-shelter"
```

Then append `dsh-theme-shelter` to `dsh.profile.bundles` in the profile `package.json`, and reload the window (<kbd>Ctrl</kbd>+<kbd>R</kbd>) or restart DSH.

Manual alternative — add to `~/.dsh/profiles/desktop/cordis.patch.yml`:

```yaml
- insert:
    - id: theme-shelter
      name: dsh-theme-shelter
```

### Usage

| Control | Effect |
| --- | --- |
| Scene | rain / snow / fire / off |
| Intensity | light / medium / heavy |
| Palette | master switch for the theme colors; the animation keeps running |
| Lightning | rain only, every 7–22 s, with thunder |
| Sound | real recordings; browsers require one gesture first |
| Night | forces the dark palette plus a moonlight wash |

Console API:

```js
__dshWeather.setScene("fire")
__dshWeather.setIntensity(2)
__dshWeather.setPalette(true)
__dshWeather.setSound(true)
__dshWeather.setNight(false)
__dshWeather.reset()
```

### Audio

Three recordings (about 7.7 MB). The host half serves them read-only at `/dsh-theme-shelter/audio/*` with `Range` (206), `HEAD`, a one-year immutable cache, and a 403 for cross-origin `Origin`. Snow reuses the rain loop at a lower volume.

### How it works

- **Colors** — `ctx.theme.overrideTokens()` overrides 47 `--dsw-alias-*` tokens: surfaces, text, borders, code blocks, scrollbars. Button fills, brand colors, links and focus rings are deliberately left alone.
- **Picture** — one fixed full-screen canvas with a particle system per scene, drawn from pre-rendered sprites.
- **Audio** — a host-only read route plus `<audio>` on the client, fading out and releasing between scenes.
- **Cost** — particle counts scale with viewport area and are capped; DPR is capped at 2; rendering pauses in a hidden window; `prefers-reduced-motion` draws a single static frame.

### Development

`preview/preview.html` is a standalone harness: it fakes the module loader and `ctx.theme`, so you can open it directly to see all three scenes, night mode and the panel.

The profile links this package with `link:`, so editing `client/client.js` only needs a DSH restart.

## Credits · 素材来源

声音素材来自 **[Pixabay](https://pixabay.com/)**，按 [Pixabay Content License](https://pixabay.com/service/license-summary/) 免费使用：

| 文件 | 用途 | 来源 |
| --- | --- | --- |
| `audio/rain.mp3` | 雨声循环（雪天复用，音量更低） | [pixabay.com](https://pixabay.com/) |
| `audio/fire.mp3` | 炉火循环 | [pixabay.com](https://pixabay.com/) |
| `audio/thunder.mp3` | 闪电后的一次性雷声 | [pixabay.com](https://pixabay.com/) |

该许可允许免费用于商业与非商业作品、无需署名；但不允许把素材**原样单独再分发**。这里是把它作为插件的一部分打包使用，符合“用于更大的作品”的范围。如果你要替换音色，直接放同名文件进 `audio/` 即可。

The ambience recordings come from **[Pixabay](https://pixabay.com/)** and are used under the [Pixabay Content License](https://pixabay.com/service/license-summary/): free for commercial and non-commercial use, no attribution required, but the files may not be redistributed as standalone assets. They are bundled here as part of a larger work. Drop a replacement with the same filename into `audio/` to swap a sound.

## License

MIT © ifer47
