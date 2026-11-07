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
  <img src="docs/night-rain.jpg" width="264" alt="夜间 · 雨" />
  <img src="docs/night-snow.jpg" width="264" alt="夜间 · 雪" />
  <img src="docs/night-fire.jpg" width="264" alt="夜间 · 炉火" />
</p>

**目录：** [三种场景](#三种场景) · [安装](#安装) · [使用](#使用) · [声音](#声音) · [工作原理](#工作原理) · [本地开发](#本地开发) · [发布](#发布) · [素材来源](#素材来源)

## 它是什么

檐下是一层很薄的天气。下雨时玻璃上会落水珠、拖出雨丝；下雪时楼外安静地飘；生火时屏幕底部有暖光和上浮的火星。

它不改 DSH 的任何功能，只改你工作时坐在里面的那点空气。入口只有右下角一颗 28px 的小按钮，其余时间它只是安静地下雨。

## 三种场景

| 场景 | 画面 | 配色 |
| --- | --- | --- |
| **雨** | 每根雨丝速度不同、随风倾斜，落地会溅开 | 冷蓝灰，暗部压到深海蓝 |
| **雪** | 两种晶型穿过同一个风场，底边的积雪随落雪长高 | 更冷更白，强调色偏冰蓝 |
| **火** | 底部暖光与脉动、上浮的火星、迸溅的火星子、缓慢上升的烟 | 暖中性：米白背景、深棕文字、琥珀强调 |

语义色（错误红 / 成功绿 / 警告黄）三种场景都不动，红还是红。

## 安装

需要 DeepSeek Harness（桌面端或 Web 端均可）。

```powershell
cd "$env:USERPROFILE\.dsh\profiles\desktop"
pnpm add "C:\path\to\dsh-theme-shelter"
```

再把它加到 profile `package.json` 的 `dsh.profile.bundles` 末尾，然后刷新窗口（<kbd>Ctrl</kbd>+<kbd>R</kbd>）或重启 DSH。

它也发布在 npm 上：[`dsh-theme-shelter`](https://www.npmjs.com/package/dsh-theme-shelter)。`npm i dsh-theme-shelter` 装的是同一个包，插件市场也会优先从 npm 安装。

npm 12 起默认不允许从远程 tarball 或 git 地址安装（安装时安全默认值）：装远程 tarball 加 `--allow-remote`，git 依赖加 `--allow-git`。本包没有任何安装脚本，其余不受影响。

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
| 强度 | 轻 / 中 / 暴：粒子密度、雨量、积雪高度、火势 |
| 配色 | 调色板总开关；关掉只留动画 |
| 闪电 | 只在雨天有效：闪电、闪光、雷声 |
| 声音 | 雨、火为录音，雪为程序化风声 |
| 夜间 | 强制深色配色 + 月光覆层 |

**关于闪电。** 一次雷击会划出一道分叉的闪电、闪一下、再响一声。雷声延迟代表距离——近处 0.3–0.9 秒，远处 1.5–2.8 秒；近雷还会在玻璃上留下 5–9 秒的裂纹。大约每 2–9 秒一次，强度越高越密。

**关于声音。** 浏览器要求页面先收到一次点击或按键才放行音频，所以第一声要等你先动一下。

设置存在 `localStorage["dsh-theme-shelter/v2"]`，刷新、重启都保留。

**首次使用。** 全新安装后，按钮上方会浮出一个小气泡「点这里切换天气」；你点它、打开面板，或者等 12 秒，它就消失且不再出现。错过了也不影响使用：按钮永远在窗口右下角，28px，图标随场景变成云 / 伞 / 雪花 / 火焰。

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

雨和火是真实录音（`audio/`，约 6.7 MB）。宿主半边注册只读路由 `/dsh-theme-shelter/audio/*` 交给浏览器，支持 `Range`（206）、`HEAD`、一年缓存，外站 `Origin` 返回 403。

雪没有录音，因为真实的雪几乎是无声的：它是一段 loop 的棕噪声，过一个约十五秒呼吸一次的低通，音量压到耳语级（0.04 / 0.07 / 0.11，雨是 0.18 / 0.30 / 0.42）。不需要任何素材，录音还没加载完就能响。

## 工作原理

- **配色**：`ctx.theme.overrideTokens()` 覆盖 47 个 `--dsw-alias-*` 令牌，只碰表面、文字、边框、代码块、滚动条；按钮填充、品牌色、链接、焦点环一律不动。
- **雨**：每滴雨带一个直径和距离。终端速度 `v = 9.2·√(d/3)`（0.5mm≈2.2m/s，3mm≈8.5m/s）；屏幕速度与宽度乘 `1/z` 透视；拖影长度 `= 速度 × 6ms 曝光`，夹在 7–70px；倾角 `atan(风/速度)`，所以毛毛雨比大雨更斜，再叠一层慢速阵风。雨丝形状是「尾细淡、头宽亮」的锥度，按 5 个宽度档 × 4 个长度档预烘焙成贴图，每帧一次 `drawImage`。
- **水花**：雨滴落到窗台时，以落速的 16%（按距离衰减）抛出 5–9 颗小水珠，重力 900 px/s²；另有一个椭圆冠环，近处较大的雨滴还会补一发几乎垂直的中心水柱。水珠不是圆的——它被画成**沿自身飞行方向压扁的椭圆**，飞行中还会振荡变形（0.5mm 以下的小水珠保持球形，表面张力占主导）。
- **雪**：带「晶型」的雪片。约三分之二是树枝状聚合（2.5–7.5 mm，0.55–1.0 m/s，缓慢自转，深色下会闪光），其余是霰（1.2–3.5 mm，1.1–1.7 m/s）。每片雪带一个深度 `z`，屏幕尺寸 `= 尺寸 × 1800 / z`；它们跟着一个**位置相干的风场**走（缓慢的基础风 + 由位置和时间采样的湍流），而不是各自摆动；落地会按质量累积到地面的雪脊上，雪脊是慢慢长出来的，不是一开始就有。
- **闪电**：递归生成的锯齿闪电，带 1–3 条分叉，用叠加混合画在画布上；闪光和雷声分开调度，所以远处的雷会先闪、过几秒再响。
- **音频**：雨和火走宿主只读路由 + 客户端 `<audio>`，切换场景时淡出并释放；雪风走一个 Web Audio 图。
- **开销**：粒子数按视口面积计算并夹上限（雨 520、雪 340、火 64），DPR 上限 2，切后台停表，`prefers-reduced-motion` 只画一帧静止画面。

## 本地开发

`preview/preview.html` 是一个不依赖 DSH 的预览壳：伪造模块加载器和 `ctx.theme`，双击即可看三种场景、夜间与面板。

profile 里是 `link:` 依赖，改完 `client/client.js` 只需重启 DSH。

## 发布

三样东西必须对齐：git tag、`package.json`、npm。市场读的是 GitHub 上的条目，再靠 `repository` 字段把 npm 包映射过来——tag 和 npm 版本一旦漂移，用户会被提示“有新版本”，装到的却是旧代码。

1. **两个地方一起改版本号** —— `package.json` 的 `version` **和** `client/client.js` 里的 `const VERSION`（面板页脚显示的是后者）。只改一处，面板会一直报上一个版本。
2. **提交、打 tag、推送：**
   ```powershell
   git commit -am "chore: release 0.3.1"
   git tag -a v0.3.1 -m "0.3.1"
   git push --follow-tags
   ```
3. **发到 npm。** `publishConfig` 已经把发布目标钉在官方源，所以即使机器级的 `.npmrc` 用的是国内镜像，也不需要加 `--registry`：
   ```powershell
   npm publish
   ```

条目里的 `tarball:` 指向 GitHub Release 上的预构建包，那是独立的一条兜底路径，只在 npm 不可达时才用得上——平时不需要手动上传。

## 已知限制

- 夜间模式不写你的外观偏好，所以设置页仍显示你原来选的浅色/深色；
- 覆盖层叠在整个窗口上，模态框、菜单上面也会落雨落雪（透明度很低）；
- 不改产品图标（那需要注册独立主题）；
- 雨声和火声来自 Pixabay（见素材来源）；雪风是程序生成的，不涉及素材授权。

## 素材来源

声音素材来自 **[Pixabay](https://pixabay.com/)**，按 [Pixabay Content License](https://pixabay.com/service/license-summary/) 免费使用：可用于商业与非商业作品、无需署名，但不允许把素材**原样单独再分发**。这里是作为插件的一部分打包，属于「用于更大的作品」。

| 文件 | 用途 |
| --- | --- |
| `audio/rain.mp3` | 雨声循环 |
| `audio/fire.mp3` | 炉火循环 |
| `audio/thunder.mp3` | 闪电后的一次性雷声 |

想换音色，直接放同名文件进 `audio/` 即可。

## License

MIT © ifer47
