const AIService = {
    DEFAULT_SYSTEM_PROMPT: '你是一位经验丰富的专业旅行顾问，名叫"小哇途"。你的回答要：\n1. 实用、接地气，给出行之有效的建议\n2. 语气亲切自然，像朋友聊天一样\n3. 推荐真实存在的地点和体验，不编造虚假信息\n4. 回答简洁明了，重点突出\n5. 当需要推荐地点时，返回结构化JSON数据以便程序处理\n\n你擅长：行程规划、美食推荐、住宿建议、路线优化、拍照贴士、当地文化体验、避坑提醒。\n\n重要：当用户要求规划完整行程时，请在文字说明后用```json包裹返回以下格式的数据：\n```json\n{\n  "textReply": "你的文字回复内容",\n  "itinerary": [\n    {\n      "theme": "Day1 主题",\n      "spots": [\n        {"name": "景点名称", "type": "景点/美食/住宿", "emoji": "📍", "reason": "推荐理由", "duration": 90, "estimatedCost": "约50元"}\n      ]\n    }\n  ]\n}\n```\n当只推荐单个地点时，返回：\n```json\n{\n  "textReply": "你的文字回复",\n  "recommendations": [\n    {"name": "地点名", "type": "类型", "emoji": "📍", "reason": "推荐理由", "suggestedDay": 1}\n  ]\n}\n```\n\n当收到候选POI列表时（用户消息中附带POI数据），严格遵守：\n- 只能使用提供的POI进行推荐，禁止新增、虚构任何地点\n- recommendations数组必须包含所有提供的POI\n- name字段必须与提供的名称完全一致',

    async chat(messages, options = {}) {
        const temperature = options.temperature ?? 0.5;
        const timeout = options.timeout ?? 30000;

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);

        try {
            const sysMsg = options.systemPrompt || this.DEFAULT_SYSTEM_PROMPT;
            const fullMessages = [{ role: 'system', content: sysMsg }, ...messages];

            if (options.jsonMode) {
                const lastUser = [...fullMessages].reverse().find(m => m.role === 'user');
                if (lastUser) {
                    lastUser.content += '\n\n请在回复文字内容后，用```json ... ```包裹返回结构化JSON数据（格式根据上下文确定）。';
                }
            }

            const response = await fetch(CONFIG.QWEN_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + CONFIG.QWEN_API_KEY,
                },
                body: JSON.stringify({
                    model: CONFIG.MODEL_NAME,
                    input: {
                        messages: fullMessages
                    },
                    parameters: {
                        result_format: 'message',
                        temperature: temperature,
                        top_p: 0.8,
                        enable_search: true,
                        incremental_output: false
                    }
                }),
                signal: controller.signal
            });

            clearTimeout(timer);

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            let content = data.output?.choices?.[0]?.message?.content || '';
            return { success: true, content, raw: data };
        } catch (err) {
            clearTimeout(timer);
            if (err.name === 'AbortError') {
                return { success: false, error: 'timeout', content: '' };
            }
            console.error('AIService.chat error:', err);
            return { success: false, error: err.message, content: '' };
        }
    },

    async quickAsk(prompt, systemPrompt, options = {}) {
        const result = await this.chat(
            [{ role: 'user', content: prompt }],
            { ...options, systemPrompt }
        );
        return result;
    },

    async askForJSON(userPrompt, jsonDescription, options = {}) {
        const prompt = `${userPrompt}\n\n请严格按照以下JSON格式返回（不要返回其他内容）：\n\`\`\`json\n${jsonDescription}\n\`\`\``;

        const result = await this.quickAsk(prompt, options.systemPrompt || this.DEFAULT_SYSTEM_PROMPT, {
            ...options,
            temperature: 0.3
        });

        if (!result.success) return { success: false, error: result.error };

        try {
            let content = result.content;
            const jsonMatch = content.match(/```json\s*([\s\S]*?)```/);
            if (jsonMatch) {
                content = jsonMatch[1].trim();
            } else {
                const braceMatch = content.match(/\{[\s\S]*\}/);
                if (braceMatch) content = braceMatch[0];
            }
            const data = JSON.parse(content);
            return { success: true, data, rawContent: result.content };
        } catch (e) {
            console.warn('JSON parse failed:', e, result.content);
            return { success: false, error: 'parse_error', rawContent: result.content };
        }
    },

    buildTripContext(trip, currentDay, currentSpot) {
        if (!trip) return '';
        const city = trip.dayPlans?.[0]?.city || trip.destination || '未知城市';
        const days = trip.days || trip.dayPlans?.length || 1;

        let ctx = `当前行程：${trip.title || city + '行程'}\n目的地：${city}\n天数：${days}天\n\n`;

        (trip.dayPlans || []).forEach((dp, di) => {
            ctx += `第${dp.day || di+1}天（${dp.theme || ''}）：\n`;
            (dp.spots || []).forEach((s, si) => {
                const time = s.startMin ? this._fmtTime(s.startMin) : '';
                ctx += `  ${time ? time + ' ' : ''}${s.emoji || ''}${s.name}（${s.type || '景点'}）`;
                if (di === currentDay && si === currentSpot) ctx += ' ◀ 当前位置';
                ctx += '\n';
            });
            ctx += '\n';
        });

        return ctx;
    },

    _fmtTime(min) {
        const h = Math.floor(min / 60);
        const m = min % 60;
        return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`;
    }
};
