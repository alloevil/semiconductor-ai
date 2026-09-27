# 内容与动画参考

核对日期：2026-09-27。以下链接用于查证与学习表达，不代表获得转载画面、音乐、配音或商标的许可。

## 第一集事实依据

### S1：ASML — The basics of microchips

https://www.asml.com/en/technology/all-about-microchips/microchip-basics

- 已读取正文。
- 适用：硅与半导体、晶体管的数字开关作用、集成电路、晶圆上的分层加工、逻辑与存储用途。
- 对应脚本：02、03、04、05、06、08、09。
- 不直接采用：历史市场规模、预测数据；将所有芯片等同于硅集成电路的简化；将沙到硅片过程压缩成直接熔化切片的描述；其功能分类不作为完整、互斥的行业分类。

### S2：IBM — What is a semiconductor?

https://www.ibm.com/think/topics/semiconductors

- 已读取正文。
- 适用：材料电学性质可通过掺杂等方式调整；晶体管可用于开关和信号放大；晶圆存在不同材料。
- 对应脚本：02、03、04。
- 不作为工艺细节的唯一依据。原文存在对元素、器件和生产流程过度概括的表述，不采用其市场份额、摩尔定律或“将集成电路安装到晶圆”的措辞。

### S3：TI — Power management

https://www.ti.com/power-management/overview.html

- 已读取正文。
- 适用：电源管理器件与电路服务于供电、效率、电池寿命等任务，说明芯片用途不限于计算。
- 对应脚本：08。
- 不采用产品营销语作为已验证的性能结论。

### S4：ASML — How microchips are made

https://www.asml.com/en/technology/all-about-microchips/how-microchips-are-made

- 已在前轮调研读取正文。
- 适用：多道工序、晶圆厂、设计制造角色的区别；作为后续集内容入口。
- 不将其中特定时期的层数、时间或洁净室指标概括为所有产品的通用值。

## 动画叙事参考

本轮之前已核对原作者账号、视频简介、章节和抽样故事板；没有声称逐帧完整观看。

### V1：TED-Ed — How are microchips made?

https://www.youtube.com/watch?v=IkRXpFIRUl4

https://ed.ted.com/lessons/how-are-microchips-made-george-zaidan-and-sajan-saini

- 约 5 分 29 秒。
- 借鉴：问题驱动、尺度切换、有限时长内的内容取舍。
- 不借鉴：复杂三维制作规模、环境议题支线；不照搬旁白。

### V2：Branch Education — How are Microchips Made?

https://www.youtube.com/watch?v=dX9CGRZwD-w

- 27 分 48 秒。视频 ID 区分大小写，使用此处已核对链接。
- 章节：05:44 简化制造流程；07:51 晶圆厂；09:54 设备分类；13:39 沉积；15:02 刻蚀；17:29 量测；23:19 晶圆测试。
- 借鉴：工厂、设备和微观加工结果之间的对应关系；更适合第 02 和第 04 集。
- 不借鉴：写实工厂模型和全面工艺细节。作者注明使用 Blender 4.1，不是 JavaScript 制作案例。

### V3：Intel — From Sand to Silicon: The Making of a Microchip

https://www.youtube.com/watch?v=_VMYPLXnd7E

- 约 4 分 45 秒。
- 借鉴：围绕加工对象组织画面，材料层颜色编码、加工前后对照。
- 不借鉴：具体一代产品的结构作为普适结构；不直接使用其视频素材。

### V4：ASML Nanoland — How are microchips made? Episode 6

https://www.youtube.com/watch?v=Z-E5IUozd7M

- 2 分 22 秒。
- 借鉴：先类比、后概念；积木与逐层搭建的直觉。
- 不借鉴：真人拍摄；不把建筑、底板或开关类比当成真实工艺。

## 技术候选：尚未选定或安装

### T1：Motion Canvas

https://motioncanvas.io/docs/

- 官方说明：TypeScript 动画库、实时编辑器，定位于与旁白同步的信息型矢量动画。
- 适合：第一集的关系图、剖面、逐步演示。
- MP4 导出路径和编码器依赖须在确认后检查。

### T2：Remotion

https://www.remotion.dev/

https://www.remotion.dev/templates

- 官方说明：使用 React 制作视频；提供字幕、音频、三维等模板。
- 适合：多集章节编排、字幕和音轨组织、重复渲染。
- 使用前核对当前许可；官网列有个人／小团队与公司不同条件，不能默认所有公司免费。

## 访问限制

本轮 Britannica 的 semiconductor 与 transistor 页面返回访问验证页，未获取正文，不作为已核实来源。
