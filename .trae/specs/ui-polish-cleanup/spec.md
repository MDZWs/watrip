# UI优化与交互改进 - Product Requirement Document

## Overview
- **Summary**: 优化行程详情页和行程列表页的UI布局与交互体验，包括：AI浮动按钮仅在行程标签显示、移除顶部冗余AI按钮、简化行李清单面板（默认空白，移除快捷模板）、为行程卡片添加长按删除功能。
- **Purpose**: 清理界面冗余元素，提升用户操作效率，让界面更简洁专注。
- **Target Users**: 所有使用旅行规划应用的用户。

## Goals
- AI浮动按钮只在行程(itinerary)标签页显示，记账和行李页面不显示
- 移除详情页顶部导航栏的AI助手按钮（保留底部浮动AI按钮即可）
- 行李清单默认空白，不预置任何物品，移除快捷模板选择区域
- 行程列表页的卡片支持长按弹出删除确认
- 保持代码整洁，移除无用的元素绑定和样式

## Non-Goals (Out of Scope)
- 不修改AI聊天功能的核心逻辑
- 不重做行李添加物品的弹窗
- 不修改记账功能
- 不添加批量删除行程功能

## Background & Context
- 现有AI浮动按钮(aiFabBtn)在行程详情页所有标签都显示，干扰记账和行李操作
- 顶部导航栏有AI按钮(detailAiBtn)和底部浮动AI按钮重复
- 行李面板默认自动填充通用模板物品，用户需要手动删除不想要的，体验不佳
- 快捷模板区域占据空间且用户反馈不常用
- 行程卡片目前只能点击打开，没有删除入口，用户无法管理已有行程

## Functional Requirements
- **FR-1**: 根据当前激活的tab控制AI浮动按钮可见性：仅itinerary tab显示，expense和packing tab隐藏
- **FR-2**: 移除顶部导航栏的detailAiBtn按钮及其点击事件绑定
- **FR-3**: 修改PackingModule初始化逻辑，默认items为空数组，不加载任何模板
- **FR-4**: 从HTML中移除行李面板的quick-template-card快捷模板区域
- **FR-5**: 清理与快捷模板相关的无用JS代码（quickApplyTpl、_renderTplBar、TEMPLATES引用等）
- **FR-6**: 为行程卡片添加长按手势检测（500ms）
- **FR-7**: 长按时显示视觉反馈（轻微缩放/震动）
- **FR-8**: 长按结束后弹出确认对话框，确认后调用AIMemory.deleteTrip删除行程并刷新列表
- **FR-9**: 防止长按时触发卡片的点击事件

## Non-Functional Requirements
- **NFR-1**: 长按检测应在移动设备和桌面端都能正常工作（桌面端用mousedown/mouseup，移动端用touchstart/touchend）
- **NFR-2**: 删除确认对话框样式需与应用整体风格一致
- **NFR-3**: 切换tab时按钮显示/隐藏切换流畅无闪烁
- **NFR-4**: 删除行程后列表立即刷新，用户能看到变化

## Constraints
- **Technical**: 使用原生JavaScript，不引入新的手势库
- **Dependencies**: 依赖已有的AIMemory.deleteTrip方法、UIRender.showToast提示

## Assumptions
- 用户可以通过底部浮动AI按钮在行程页随时唤起AI助手，不需要顶部按钮
- 行李清单由用户完全自定义添加，不需要预置模板
- 长按操作对于移动端用户是直观的删除手势

## Acceptance Criteria

### AC-1: AI浮动按钮仅在行程标签显示
- **Given**: 用户打开行程详情页
- **When**: 切换到"行程"/"记账"/"行李"不同标签
- **Then**: "行程"标签显示✨浮动按钮，"记账"和"行李"标签隐藏该按钮
- **Verification**: `programmatic` + `human-judgment`

### AC-2: 移除顶部AI按钮
- **Given**: 用户打开行程详情页
- **When**: 查看顶部导航栏
- **Then**: 导航栏不显示AI助手按钮，只显示分享按钮
- **Verification**: `human-judgment`

### AC-3: 行李清单默认空白
- **Given**: 用户创建新行程并进入行李页
- **When**: 首次打开行李标签
- **Then**: 行李清单区域为空，显示"暂无物品，点击下方'添加物品'开始整理"提示，不显示快捷模板区域
- **Verification**: `programmatic` + `human-judgment`

### AC-4: 行程卡片长按删除
- **Given**: 用户在行程列表页
- **When**: 长按某个行程卡片约500ms
- **Then**: 弹出确认对话框询问是否删除，点击确认后行程被删除，列表刷新显示最新数据
- **Verification**: `programmatic` + `human-judgment`

### AC-5: 长按不触发点击
- **Given**: 用户长按行程卡片触发删除
- **When**: 松开手指/鼠标
- **Then**: 不会跳转到行程详情页，只处理删除逻辑
- **Verification**: `programmatic`

## Open Questions
- [ ] 删除行程确认对话框使用原生confirm还是自定义模态框？（建议使用自定义保持风格一致，但原生confirm实现更快）
