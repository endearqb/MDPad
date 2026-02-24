以下是使用网页模拟的经典MDPad主题
```
import React, { useState, useEffect } from 'react';
import { 
  Minus, Square, X, Save, Download, Sun, 
  Bold, Italic, Code, Link,
  Heading1, Heading2, List, Quote, CheckSquare, Image as ImageIcon,
  Search, ChevronUp, Wifi, Battery, Volume2, FileText, LayoutTemplate
} from 'lucide-react';

export default function App() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full h-screen overflow-hidden relative select-none bg-cover bg-center font-sans" 
         style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop")' }}>
      
      {/* 桌面图标 */}
      <div className="absolute top-4 left-4 flex flex-col gap-4">
        <div className="flex flex-col items-center justify-center w-20 h-24 hover:bg-white/20 rounded-sm cursor-pointer transition-colors group">
          <div className="w-12 h-12 bg-white/90 backdrop-blur-md border border-white/20 rounded-xl shadow-lg flex items-center justify-center mb-1 group-hover:shadow-xl transition-all">
            <LayoutTemplate className="text-blue-600 w-6 h-6" />
          </div>
          <span className="text-white text-xs text-center drop-shadow-md font-medium">设计演示</span>
        </div>
      </div>

      {/* --- 主应用程序窗口 (Mockup 状态) --- */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[860px] h-[640px] bg-[#fcfcfc] rounded-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden border border-gray-200/60 ring-1 ring-black/5">
        
        {/* 1. 极简标题栏 */}
        <div className="flex items-center justify-between h-12 bg-white/80 backdrop-blur-md border-b border-gray-100">
          {/* 左侧：保存、另存、主题切换 */}
          <div className="flex items-center h-full pl-3 gap-1">
            <button className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors tooltip-trigger relative">
              <Save className="w-[18px] h-[18px]" strokeWidth={2} />
            </button>
            <button className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors">
              <Download className="w-[18px] h-[18px]" strokeWidth={2} />
            </button>
            <div className="w-[1px] h-4 bg-gray-200 mx-1.5"></div>
            <button className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors">
              <Sun className="w-[18px] h-[18px]" strokeWidth={2} />
            </button>
          </div>

          {/* 中间：文件名 */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-none">
            <span className="text-[13px] font-semibold text-gray-700 tracking-wide">产品构思.md</span>
          </div>
          
          {/* 右侧：Windows 三键 */}
          <div className="flex items-center h-full">
            <button className="h-full px-4 text-gray-500 hover:bg-gray-100 transition-colors flex items-center justify-center">
              <Minus className="w-4 h-4" strokeWidth={2} />
            </button>
            <button className="h-full px-4 text-gray-500 hover:bg-gray-100 transition-colors flex items-center justify-center">
              <Square className="w-3.5 h-3.5" strokeWidth={2.5} />
            </button>
            <button className="h-full px-4 text-gray-500 hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center">
              <X className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* 2. 编辑区 (静态 UI 画布) */}
        <div className="flex-1 relative overflow-hidden bg-[#fcfcfc] text-gray-800 selection:bg-blue-200">
          <div className="max-w-3xl mx-auto px-16 py-12 h-full text-[15px] leading-[1.8]">
            
            {/* 模拟已输入的标题 */}
            <h1 className="text-4xl font-extrabold text-gray-900 mb-6 tracking-tight">产品构思与架构设计</h1>
            <p className="mb-4 text-gray-600">这是一款追求极致纯粹的写作软件。它抛弃了繁杂的菜单栏，将所有格式化工具隐藏在用户的直觉操作中。</p>

            {/* --- 功能展示 A：划词菜单 (Bubble Menu) --- */}
            <div className="relative inline-block mb-4 mt-2">
              <p className="inline">通过选中文本，我们可以优雅地唤出</p>
              
              {/* 被选中的文本背景 */}
              <span className="bg-blue-100 text-blue-900 rounded-[2px] px-0.5 relative inline-block mx-1">
                所见即所得
                
                {/* 悬浮的划词菜单 UI */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 -translate-y-2 flex items-center gap-0.5 p-1 bg-gray-900 rounded-lg shadow-xl border border-gray-700 z-10 before:content-[''] before:absolute before:top-full before:left-1/2 before:-translate-x-1/2 before:border-4 before:border-transparent before:border-t-gray-900">
                  <button className="p-1.5 text-gray-300 hover:text-white hover:bg-gray-800 rounded-md"><Bold className="w-4 h-4" /></button>
                  <button className="p-1.5 text-gray-300 hover:text-white hover:bg-gray-800 rounded-md"><Italic className="w-4 h-4" /></button>
                  <button className="p-1.5 text-gray-300 hover:text-white hover:bg-gray-800 rounded-md"><Code className="w-4 h-4" /></button>
                  <div className="w-[1px] h-4 bg-gray-700 mx-0.5"></div>
                  <button className="p-1.5 text-gray-300 hover:text-white hover:bg-gray-800 rounded-md"><Link className="w-4 h-4" /></button>
                </div>
              </span>
              <p className="inline">的排版工具，无需视线离开当前编辑区域。</p>
            </div>

            <h2 className="text-2xl font-bold text-gray-800 mt-8 mb-4 pb-2 border-b border-gray-100">核心交互逻辑</h2>
            <ul className="list-disc pl-5 mb-6 text-gray-600 space-y-2">
              <li>默认进入编辑态即预览态，消除割裂感。</li>
              <li>使用经典的 Windows 布局，符合直觉。</li>
            </ul>

            {/* --- 功能展示 B：斜杠菜单 (Slash Menu) --- */}
            <div className="relative flex items-center mt-8">
              {/* 输入行 */}
              <div className="flex items-center text-gray-400">
                <span className="font-mono bg-gray-100 px-1.5 rounded text-[15px]">/</span>
                <span className="w-[1.5px] h-[1.2em] bg-blue-500 animate-pulse ml-[1px]"></span>
                <span className="ml-2 text-sm text-gray-300 select-none">继续输入以过滤菜单...</span>
              </div>

              {/* 悬浮的斜杠菜单 UI */}
              <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-gray-100/80 overflow-hidden z-20 flex flex-col py-1.5">
                <div className="px-3 py-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">基础块</div>
                
                <div className="flex items-center gap-3 px-3 py-2 hover:bg-blue-50 cursor-pointer group">
                  <div className="w-8 h-8 rounded bg-gray-50 flex items-center justify-center border border-gray-100 group-hover:bg-white group-hover:border-blue-100 group-hover:text-blue-500 transition-colors">
                    <Heading1 className="w-4 h-4 text-gray-500 group-hover:text-blue-500" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700">一级标题</span>
                    <span className="text-[11px] text-gray-400">大型章节标题</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 px-3 py-2 hover:bg-blue-50 cursor-pointer group">
                  <div className="w-8 h-8 rounded bg-gray-50 flex items-center justify-center border border-gray-100 group-hover:bg-white group-hover:border-blue-100 transition-colors">
                    <Heading2 className="w-4 h-4 text-gray-500 group-hover:text-blue-500" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700">二级标题</span>
                    <span className="text-[11px] text-gray-400">中型章节标题</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 px-3 py-2 hover:bg-blue-50 cursor-pointer group">
                  <div className="w-8 h-8 rounded bg-gray-50 flex items-center justify-center border border-gray-100 group-hover:bg-white group-hover:border-blue-100 transition-colors">
                    <List className="w-4 h-4 text-gray-500 group-hover:text-blue-500" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700">无序列表</span>
                    <span className="text-[11px] text-gray-400">创建一个简单的项目列表</span>
                  </div>
                </div>

                <div className="px-3 py-1.5 mt-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider border-t border-gray-50">媒体与高级</div>
                
                <div className="flex items-center gap-3 px-3 py-2 hover:bg-blue-50 cursor-pointer group">
                  <div className="w-8 h-8 rounded bg-gray-50 flex items-center justify-center border border-gray-100 group-hover:bg-white group-hover:border-blue-100 transition-colors">
                    <ImageIcon className="w-4 h-4 text-gray-500 group-hover:text-blue-500" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700">图片</span>
                    <span className="text-[11px] text-gray-400">上传或嵌入链接</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* 3. 极简状态栏 */}
        <div className="h-7 border-t border-gray-100 bg-gray-50/50 flex items-center px-4 justify-between text-[11px] text-gray-400 font-medium">
          <div className="flex items-center gap-4">
            <span className="hover:text-gray-600 cursor-pointer">UTF-8</span>
            <span className="hover:text-gray-600 cursor-pointer flex items-center gap-1"><CheckSquare className="w-3 h-3"/> 已保存</span>
          </div>
          <div>428 字符</div>
        </div>
      </div>

      {/* --- 底部任务栏 (Windows 11 风格) --- */}
      <div className="absolute bottom-0 w-full h-12 bg-[#f3f3f3]/80 backdrop-blur-xl border-t border-white/50 flex items-center justify-between px-4 z-50">
        
        {/* 左侧小组件占位 */}
        <div className="flex items-center gap-2 text-gray-600 text-[13px] font-medium w-32 hover:bg-white/40 px-2 py-1 rounded-md cursor-default transition-colors">
          <span>🌤 26°C</span>
        </div>

        {/* 居中任务栏图标 */}
        <div className="flex items-center gap-1.5">
          {/* 开始按钮 */}
          <div className="w-10 h-10 rounded-md hover:bg-white/60 flex items-center justify-center cursor-pointer transition-all active:scale-95">
             <div className="grid grid-cols-2 gap-[2px]">
                <div className="w-3 h-3 bg-[#0078D4] rounded-[2px]"></div>
                <div className="w-3 h-3 bg-[#0078D4] rounded-[2px]"></div>
                <div className="w-3 h-3 bg-[#0078D4] rounded-[2px]"></div>
                <div className="w-3 h-3 bg-[#0078D4] rounded-[2px]"></div>
             </div>
          </div>
          
          {/* 搜索按钮 */}
          <div className="w-10 h-10 rounded-md hover:bg-white/60 flex items-center justify-center cursor-pointer transition-all active:scale-95">
            <Search className="w-5 h-5 text-gray-700" />
          </div>

          {/* 打开的应用图标 (带指示线) */}
          <div className="relative w-10 h-10 rounded-md flex items-center justify-center cursor-pointer transition-all bg-white/60 shadow-sm border border-gray-200/50">
            <LayoutTemplate className="w-5 h-5 text-blue-600" />
            <div className="absolute bottom-0 w-3.5 h-[3px] bg-blue-500 rounded-t-full"></div>
          </div>
        </div>

        {/* 右侧系统托盘 */}
        <div className="flex items-center gap-2 text-gray-700 pr-2">
          <div className="hover:bg-white/50 p-1.5 rounded-md cursor-pointer transition-colors">
            <ChevronUp className="w-[18px] h-[18px]" strokeWidth={2} />
          </div>
          <div className="flex items-center gap-2.5 hover:bg-white/50 px-2.5 py-1.5 rounded-md cursor-pointer transition-colors">
            <Wifi className="w-[18px] h-[18px]" strokeWidth={2} />
            <Volume2 className="w-[18px] h-[18px]" strokeWidth={2} />
            <Battery className="w-[18px] h-[18px]" strokeWidth={2} />
          </div>
          <div className="flex flex-col items-end justify-center text-[12px] font-medium leading-[1.2] hover:bg-white/50 px-2.5 py-1 rounded-md cursor-pointer transition-colors">
            <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <span>{currentTime.toLocaleDateString().replace(/\//g, '/')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
```