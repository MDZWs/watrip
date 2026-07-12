# 长按优化与AI推荐三层架构重构 - Product Requirement Document

## Overview
- **Summary**: 优化行程卡片长按删除的交互体验（增加移动容差、改进触发逻辑），并重构AI景点推荐架构为"硬约束-排序-润色"三层：代码层负责调用高德API搜索附近POI、计算距离、按20km阈值硬过滤、按距离升序取Top5候选；AI层仅对代码已确定的候选景点做文案润色，禁止AI虚构景点。
- **Purpose**: 解决AI做空间计算不准确导致推荐虚假/远距离景点的问题，同时优化长按删除的可用性，让推荐结果100%真实、距离可控。
- **Target Users**: 使用AI旅行助手进行附近推荐（美食/酒店/景点/体验）的用户。

## Goals
- 长按删除交互更稳定：手指/鼠标允许一定移动容差(10px)，不轻易误触取消
- 长按删除触发后视觉反馈明确，弹出自定义确认弹窗（替代原生confirm，更符合应用风格）
- 重构AI附近推荐流程：所有"附近推荐"类快捷操作（找美食、找酒店、找体验、填充空闲等）先由代码层搜索高德真实POI
- 搜索基于参考点坐标：取当前天最后一个有坐标的景点作为中心，无景点时取城市中心
- 硬约束：仅保留距离参考点20km以内的POI
- 排序层：按距离升序排列，美食额外考虑评分，取Top5
- AI润色层：将Top5真实POI（含名称+距离+地址）传给AI，prompt严格限制"只能使用提供的景点，不得新增、改名、编造"，AI只写推荐语
- 最终展示和添加按钮与现有一致，用户无感知架构变化但结果更准确

## Non-Goals (Out of Scope)
- 不重构路线优化(optimize)功能——这是重排已有景点顺序，不涉及POI搜索
- 不重构行程整体规划(plan)功能——这是从零规划，不是"附近推荐"
- 不修改避坑提示(tips)功能——纯文字建议，不涉及POI
- 不重构自由输入消息的处理——仅重构快捷操作按钮（美食/酒店/体验等"附近推荐"场景）
- 不修改AI聊天界面样式

## Background & Context
- 现有问题：AI被要求做空间计算（"我在某景点附近推荐美食"），AI仅凭文字信息虚构地名或推荐其他城市的同名地点，导致地理编码后出现相距1310km的错误匹配
- 根本原因：AI没有地理空间概念，让AI做空间搜索是用其所短
- 高德API已集成在map.js中，有PlaceSearch支持searchNearBy周边搜索，有距离计算函数_calcDistance
- 附近POI搜索是确定性任务，3行代码比prompt调优更可靠
- 现有长按逻辑的问题：touchmove时立即取消长按，用户手指稍有抖动就触发cancelPress，实际移动端体验差

## Functional Requirements

### 长按删除优化
- **FR-1**: 记录按压起始坐标，touchmove/mousemove时计算位移，位移超过10px才取消长按（容差内不取消）
- **FR-2**: 长按时卡片添加缩放+透明度反馈，且添加一个删除图标提示（如右上角浮现🗑️图标）
- **FR-3**: 弹出自定义确认对话框而非原生confirm，对话框包含行程名称、两个按钮"取消"/"删除"
- **FR-4**: 自定义确认对话框样式与应用风格一致（圆角、渐变按钮、半透明遮罩）
- **FR-5**: 点击遮罩或"取消"按钮关闭弹窗；点击"删除"执行删除并刷新列表

### AI推荐三层架构
- **FR-6**: 在MapModule中新增`searchNearbyPOIs(centerLng, centerLat, type, radius)`方法：
  - 基于AMap.PlaceSearch.searchNearBy搜索周边POI
  - type参数支持：'food'(美食)、'hotel'(酒店)、'scenic'(景点)、'experience'(体验/文化)
  - radius默认20000米(20km)
  - 返回POI数组：{name, address, lng, lat, distance(km, 保留1位小数), rating, cost, tel, type}
  - 结果按距离升序，美食类按 (rating*2 - distance*0.1) 综合排序
  - 去重（相同名称只保留最近的一个）
  - Top5返回
- **FR-7**: 新增AIChat._getReferencePoint()方法：
  - 取当前天dayPlans[currentDay]的spots数组
  - 找到最后一个有有效lng/lat的景点作为参考中心点
  - 如果当天没有有坐标的景点，回退到城市中心点（通过MapModule.getCityCenter获取）
  - 返回 {lng, lat, name}
- **FR-8**: 重构AIChat.handleQuickAction，将"附近推荐"类操作改为三层流程：
  - Step 1（UI层）：显示loading（"正在搜索附近{类型}..."）
  - Step 2（硬约束层）：调用_getReferencePoint获取参考点，然后调用MapModule.searchNearbyPOIs搜索真实POI（20km半径）
  - Step 3（排序层）：searchNearbyPOIs内部已排序取Top5
  - Step 4（AI润色层）：将候选POI列表以格式化文本传给AI，prompt严格约束只能使用这些POI，AI返回推荐文案（textReply）并原样返回recommendations列表（POI的真实数据，不是AI编的）
  - Step 5：appendAIMessage展示，推荐卡片使用真实POI数据（含距离标签）
- **FR-9**: 候选POI格式化传给AI的格式示例：
  ```
  以下是你所在位置20km范围内真实存在的美食POI（按距离由近到远排序）：
  1. 南翔馒头店(距离0.3km, 地址:豫园路85号, 评分4.5)
  2. 绿波廊(距离0.5km, 地址:豫园路115号, 评分4.3)
  ...
  请基于以上POI写一段美食推荐语（100字以内），并以JSON返回，recommendations数组必须原样包含上述所有5个POI（name/address/type/emoji/estimatedCost从POI信息推导，reason简短描述特色）。禁止推荐以上列表之外的餐厅，禁止修改名称。
  ```
- **FR-10**: AI返回的recommendations与代码层的候选POI合并/校验，以代码层坐标数据为准（防止AI篡改坐标/地址）
- **FR-11**: 自由输入消息中包含"附近"、"周边"等关键词时，也尝试触发三层流程（简化处理：检测关键词后走附近美食搜索）
- **FR-12**: 搜索失败或无结果时，降级返回提示"附近20km内未找到合适的{类型}，你可以尝试手动添加或扩大范围"

## Non-Functional Requirements
- **NFR-1**: 附近POI搜索应在2秒内完成（高德API响应通常<500ms）
- **NFR-2**: 三层流程中AI温度参数调低至0.3（更确定性，减少虚构）
- **NFR-3**: 自定义确认弹窗居中显示，动画流畅（fadeIn + scale）
- **NFR-4**: 长按容差10px，不影响正常点击和滚动

## Constraints
- **Technical**: 高德API PlaceSearch的searchNearBy方法签名为 searchNearBy(keyword, center, radius, callback)，center为AMap.LngLat或[lng,lat]
- **Dependencies**: 依赖已有的MapModule._calcDistance、MapModule.getCityCenter、AIMemory.deleteTrip
- **分类关键词映射**：
  - food: '美食|餐厅|小吃|特色菜'
  - hotel: '酒店|宾馆|民宿|住宿'
  - scenic: '景点|风景区|名胜古迹'
  - experience: '茶馆|相声|非遗|市集|体验馆|艺术馆'

## Assumptions
- 当前行程的目的地城市已确定，城市中心点可通过高德Geocoder获取
- 当天已有景点的坐标是正确的（经过之前地理编码修复后已大幅提升准确性）
- 高德周边搜索返回的POI数据可靠（名称、地址、坐标真实存在）
- 用户长按删除意图通常很明确，10px容差不会导致大量误触发

## Acceptance Criteria

### AC-1: 长按容差改进
- **Given**: 用户在行程卡片上按下手指/鼠标
- **When**: 手指移动距离小于10px并保持按压500ms
- **Then**: 长按正常触发，显示视觉反馈和删除弹窗；移动超过10px才取消长按
- **Verification**: `programmatic` + `human-judgment`

### AC-2: 自定义删除确认弹窗
- **Given**: 用户长按行程卡片触发删除
- **When**: 松开手指
- **Then**: 弹出自定义样式确认弹窗（不是浏览器原生confirm），显示行程名称和"取消"/"删除"按钮，点击遮罩/取消关闭弹窗，点击删除执行删除
- **Verification**: `human-judgment`

### AC-3: 附近美食推荐三层架构
- **Given**: 用户打开AI助手，点击"找美食"
- **When**: 在已有景点（如外滩）的行程中触发推荐
- **Then**: 代码搜索外滩20km内真实POI→排序取Top5→AI基于真实POI写推荐语，展示的推荐卡片均为真实存在的地点，距离信息准确（不会出现1310km外的地点）
- **Verification**: `programmatic` + `human-judgment`

### AC-4: AI不得虚构景点
- **Given**: 三层流程传给AI 5个候选POI
- **When**: AI返回推荐结果
- **Then**: recommendations数组中每个景点的name必须在候选列表中，坐标/距离使用代码层真实数据（即使AI返回错误坐标也以代码层为准）
- **Verification**: `programmatic`

### AC-5: 无参考点时回退城市中心
- **Given**: 用户在新行程（还没有添加任何景点）中点击"找美食"
- **When**: 触发推荐
- **Then**: 代码以城市中心为参考点搜索20km内POI，正常返回推荐结果
- **Verification**: `programmatic`

### AC-6: 搜索失败降级
- **Given**: 网络异常或高德API返回空
- **When**: 触发附近推荐
- **Then**: 显示友好提示"附近20km内未找到合适的{类型}..."，不抛异常不崩溃
- **Verification**: `programmatic`

## Open Questions
- [ ] 长按删除时右上角的🗑️图标是否需要？还是仅缩放+透明度反馈即可？（建议先做缩放反馈，图标作为锦上添花）
- [ ] "填充空闲时间"快捷操作如何定义搜索类型？建议搜索附近景点/咖啡馆等小体量场所（scenic + experience + 咖啡类型）
