// ========== 全局访问密码 ==========
(function() {
  'use strict';

  // TODO: 修改为你自己的密码
  const ACCESS_PASSWORD = 'passcode-2025';
  const STORAGE_KEY = 'docsify-access-granted';
  const OVERLAY_ID = 'docs-password-overlay';

  // 如果未配置密码则跳过
  if (!ACCESS_PASSWORD) return;

  const storage = {
    get() {
      try {
        return localStorage.getItem(STORAGE_KEY) === 'true';
      } catch (e) {
        console.warn('无法读取本地存储', e);
        return false;
      }
    },
    set(val) {
      try {
        localStorage.setItem(STORAGE_KEY, val ? 'true' : 'false');
      } catch (e) {
        console.warn('无法写入本地存储', e);
      }
    }
  };

  const blurContent = () => {
    const app = document.getElementById('app');
    if (app) {
      app.style.filter = 'blur(6px)';
      app.setAttribute('aria-hidden', 'true');
    }
    const cover = document.getElementById('custom-cover');
    if (cover) {
      cover.style.filter = 'blur(6px)';
    }
  };

  const unblurContent = () => {
    const app = document.getElementById('app');
    if (app) {
      app.style.filter = '';
      app.removeAttribute('aria-hidden');
    }
    const cover = document.getElementById('custom-cover');
    if (cover) {
      cover.style.filter = '';
    }
  };

  const removeOverlay = () => {
    const overlay = document.getElementById(OVERLAY_ID);
    if (overlay) {
      overlay.remove();
    }
    document.body.style.overflow = '';
  };

  const handleUnlock = (input, hint) => {
    if (input.value === ACCESS_PASSWORD) {
      storage.set(true);
      unblurContent();
      removeOverlay();
    } else {
      hint.textContent = '密码错误，请重试';
      hint.style.color = '#e53935';
      input.value = '';
      input.focus();
    }
  };

  const renderOverlay = () => {
    if (storage.get()) return;

    blurContent();
    document.body.style.overflow = 'hidden';

    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: radial-gradient(circle at 20% 20%, rgba(66,185,131,0.15), rgba(0,0,0,0.8)),
                  radial-gradient(circle at 80% 80%, rgba(66,133,244,0.15), rgba(0,0,0,0.8));
      backdrop-filter: blur(6px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      padding: 20px;
    `;

    const card = document.createElement('div');
    card.style.cssText = `
      background: rgba(28,28,30,0.9);
      color: #e8eaed;
      padding: 28px;
      border-radius: 14px;
      max-width: 420px;
      width: 100%;
      box-shadow: 0 12px 40px rgba(0,0,0,0.45);
      border: 1px solid rgba(255,255,255,0.08);
      font-family: "Helvetica Neue", Arial, sans-serif;
    `;

    const title = document.createElement('h2');
    title.textContent = '访问验证';
    title.style.cssText = 'margin: 0 0 12px; font-size: 22px;';

    const desc = document.createElement('p');
    desc.textContent = '请输入访问密码查看文档';
    desc.style.cssText = 'margin: 0 0 16px; color: #b0b3b8;';

    const input = document.createElement('input');
    input.type = 'password';
    input.placeholder = '输入密码';
    input.autocomplete = 'off';
    input.style.cssText = `
      width: 100%;
      padding: 12px 14px;
      border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.15);
      background: rgba(255,255,255,0.05);
      color: #e8eaed;
      outline: none;
      font-size: 15px;
      margin-bottom: 12px;
    `;

    const hint = document.createElement('div');
    hint.style.cssText = 'height: 20px; font-size: 13px; color: #9aa0a6; margin-bottom: 12px;';

    const btn = document.createElement('button');
    btn.textContent = '解锁';
    btn.style.cssText = `
      width: 100%;
      padding: 12px 14px;
      border-radius: 10px;
      border: none;
      background: linear-gradient(120deg, #42b983, #36a1f2);
      color: #fff;
      font-size: 15px;
      cursor: pointer;
      font-weight: 600;
    `;

    btn.addEventListener('click', () => handleUnlock(input, hint));
    input.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') {
        handleUnlock(input, hint);
      }
    });

    card.appendChild(title);
    card.appendChild(desc);
    card.appendChild(input);
    card.appendChild(hint);
    card.appendChild(btn);
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    setTimeout(() => input.focus(), 50);
  };

  if (!storage.get()) {
    document.addEventListener('DOMContentLoaded', renderOverlay);
  }
})();

// ========== 暗色模式功能 ==========
(function() {
  'use strict';
  
  // 主题管理器
  const ThemeManager = {
    STORAGE_KEY: 'docsify-theme',
    
    // 获取系统偏好设置
    getSystemPreference: function() {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
      return 'light';
    },
    
    // 从本地存储获取主题设置
    getSavedTheme: function() {
      try {
        return localStorage.getItem(this.STORAGE_KEY);
      } catch (e) {
        console.warn('无法访问 localStorage:', e);
        return null;
      }
    },
    
    // 保存主题设置到本地存储
    saveTheme: function(theme) {
      try {
        localStorage.setItem(this.STORAGE_KEY, theme);
      } catch (e) {
        console.warn('无法保存主题到 localStorage:', e);
      }
    },
    
    // 应用主题
    applyTheme: function(theme) {
      const root = document.documentElement;
      
      if (theme === 'dark') {
        root.setAttribute('data-theme', 'dark');
        this.updateThemeIcon('☀️'); // 显示太阳图标表示可以切换到亮色
      } else {
        root.setAttribute('data-theme', 'light');
        this.updateThemeIcon('🌙'); // 显示月亮图标表示可以切换到暗色
      }
      
      this.saveTheme(theme);
      
      // 触发主题变更事件
      window.dispatchEvent(new CustomEvent('themechange', { 
        detail: { theme: theme } 
      }));
    },
    
    // 更新主题图标
    updateThemeIcon: function(icon) {
      const iconElement = document.querySelector('.theme-icon');
      if (iconElement) {
        iconElement.textContent = icon;
      }
    },
    
    // 切换主题
    toggleTheme: function() {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      this.applyTheme(newTheme);
    },
    
    // 初始化主题
    init: function() {
      // 优先级：保存的设置 > 系统偏好 > 默认亮色
      const savedTheme = this.getSavedTheme();
      const systemTheme = this.getSystemPreference();
      const initialTheme = savedTheme || systemTheme || 'light';
      
      this.applyTheme(initialTheme);
      
      // 监听系统主题变化
      if (window.matchMedia) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleSystemThemeChange = (e) => {
          // 只在没有手动设置过主题时才跟随系统
          if (!this.getSavedTheme()) {
            this.applyTheme(e.matches ? 'dark' : 'light');
          }
        };
        
        // 现代浏览器
        if (mediaQuery.addEventListener) {
          mediaQuery.addEventListener('change', handleSystemThemeChange);
        } else if (mediaQuery.addListener) {
          // 旧版浏览器兼容
          mediaQuery.addListener(handleSystemThemeChange);
        }
      }
      
      return this;
    }
  };
  
  // 初始化主题（尽早执行以避免闪烁）
  ThemeManager.init();
  
  // 页面加载完成后绑定事件
  window.addEventListener('DOMContentLoaded', function() {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', function(e) {
        e.preventDefault();
        ThemeManager.toggleTheme();
        
        // 添加点击动画效果
        this.style.transform = 'scale(0.9)';
        setTimeout(() => {
          this.style.transform = 'scale(1)';
        }, 150);
      });
      
      // 添加键盘支持
      themeToggle.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.click();
        }
      });
      
      // 确保按钮可访问性
      themeToggle.setAttribute('aria-label', '切换深色/浅色主题');
      themeToggle.setAttribute('role', 'button');
      themeToggle.setAttribute('tabindex', '0');
    }
  });
  
  // 将主题管理器暴露到全局作用域，以便调试
  window.ThemeManager = ThemeManager;
  
})();

// ========== 增强阅读进度条功能 ==========
(function() {
  'use strict';
  
  const ReadingProgressBar = {
    progressBar: null,
    progressContainer: null,
    percentageDisplay: null,
    chapterIndicators: null,
    isVisible: false,
    
    // 初始化进度条
    init: function() {
      this.progressContainer = document.getElementById('reading-progress');
      this.progressBar = document.getElementById('reading-progress-bar');
      this.percentageDisplay = document.getElementById('progress-percentage');
      this.chapterIndicators = document.querySelector('.chapter-indicators');
      
      if (!this.progressBar || !this.progressContainer) {
        console.warn('阅读进度条元素未找到');
        return false;
      }
      
      this.bindEvents();
      this.generateChapterMarkers();
      return true;
    },
    
    // 绑定滚动事件
    bindEvents: function() {
      const throttledUpdate = this.throttle(this.updateProgress.bind(this), 16); // ~60fps
      window.addEventListener('scroll', throttledUpdate, { passive: true });
      window.addEventListener('resize', this.throttle(this.generateChapterMarkers.bind(this), 250));
      
      // 监听路由变化重新生成章节标记
      window.addEventListener('hashchange', () => {
        setTimeout(() => this.generateChapterMarkers(), 500);
      });
    },
    
    // 更新进度条
    updateProgress: function() {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
      
      if (documentHeight <= 0) {
        this.hideProgress();
        return;
      }
      
      const progress = Math.min(Math.max(scrollTop / documentHeight, 0), 1);
      const percentage = Math.round(progress * 100);
      
      // 更新进度条宽度
      if (this.progressBar) {
        this.progressBar.style.width = `${percentage}%`;
      }
      
      // 更新百分比显示
      if (this.percentageDisplay) {
        this.percentageDisplay.textContent = `${percentage}%`;
        
        // 显示/隐藏百分比
        if (scrollTop > 100 && !this.percentageDisplay.classList.contains('show')) {
          this.percentageDisplay.classList.add('show');
        } else if (scrollTop <= 100 && this.percentageDisplay.classList.contains('show')) {
          this.percentageDisplay.classList.remove('show');
        }
      }
      
      // 显示/隐藏进度条
      if (scrollTop > 50) {
        this.showProgress();
      } else {
        this.hideProgress();
      }
    },
    
    // 显示进度条
    showProgress: function() {
      if (!this.isVisible && this.progressContainer) {
        this.progressContainer.style.opacity = '1';
        this.isVisible = true;
      }
    },
    
    // 隐藏进度条
    hideProgress: function() {
      if (this.isVisible && this.progressContainer) {
        this.progressContainer.style.opacity = '0';
        this.isVisible = false;
      }
    },
    
    // 生成章节标记
    generateChapterMarkers: function() {
      if (!this.chapterIndicators) return;
      
      // 清空现有标记
      this.chapterIndicators.innerHTML = '';
      
      // 获取所有章节标题
      const headings = document.querySelectorAll('.markdown-section h1, .markdown-section h2');
      if (headings.length <= 1) return;
      
      const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (documentHeight <= 0) return;
      
      headings.forEach(heading => {
        const rect = heading.getBoundingClientRect();
        const elementTop = rect.top + window.pageYOffset;
        const percentage = (elementTop / documentHeight) * 100;
        
        if (percentage >= 0 && percentage <= 100) {
          const marker = document.createElement('div');
          marker.className = 'chapter-marker';
          marker.style.left = `${percentage}%`;
          marker.title = heading.textContent.trim();
          this.chapterIndicators.appendChild(marker);
        }
      });
    },
    
    // 节流函数
    throttle: function(func, wait) {
      let timeout;
      let previous = 0;
      
      return function() {
        const now = Date.now();
        const remaining = wait - (now - previous);
        const context = this;
        const args = arguments;
        
        if (remaining <= 0 || remaining > wait) {
          if (timeout) {
            clearTimeout(timeout);
            timeout = null;
          }
          previous = now;
          func.apply(context, args);
        } else if (!timeout) {
          timeout = setTimeout(function() {
            previous = Date.now();
            timeout = null;
            func.apply(context, args);
          }, remaining);
        }
      };
    }
  };
  
  // 初始化进度条
  window.addEventListener('DOMContentLoaded', function() {
    ReadingProgressBar.init();
  });
  
  window.addEventListener('load', function() {
    setTimeout(() => {
      ReadingProgressBar.generateChapterMarkers();
      ReadingProgressBar.updateProgress();
    }, 500);
  });
  
  // Docsify 钩子
  if (typeof window.$docsify !== 'undefined') {
    window.$docsify.plugins = window.$docsify.plugins || [];
    window.$docsify.plugins.push(function(hook) {
      hook.doneEach(function() {
        setTimeout(() => {
          ReadingProgressBar.generateChapterMarkers();
          ReadingProgressBar.updateProgress();
        }, 300);
      });
    });
  }
  
  // 暴露到全局作用域
  window.ReadingProgressBar = ReadingProgressBar;
  
})();

// ========== 增强搜索功能 ==========
(function() {
  'use strict';
  
  const EnhancedSearch = {
    STORAGE_KEY: 'docsify-search-history',
    MAX_HISTORY_ITEMS: 10,
    searchInput: null,
    resultsPanel: null,
    originalResults: null,
    searchHistory: [],
    
    // 初始化增强搜索
    init: function() {
      this.loadSearchHistory();
      this.initializeElements();
      this.bindEvents();
      return this;
    },
    
    // 初始化搜索元素
    initializeElements: function() {
      // 等待搜索输入框生成
      const waitForSearch = () => {
        this.searchInput = document.querySelector('.search input');
        if (!this.searchInput) {
          setTimeout(waitForSearch, 100);
          return;
        }
        
        // 创建增强的搜索结果面板
        this.createResultsPanel();
        this.enhanceSearchInput();
      };
      
      waitForSearch();
    },
    
    // 创建搜索结果面板
    createResultsPanel: function() {
      const searchContainer = this.searchInput.closest('.search');
      if (!searchContainer || searchContainer.querySelector('.results-panel')) return;
      
      this.resultsPanel = document.createElement('div');
      this.resultsPanel.className = 'results-panel';
      this.resultsPanel.innerHTML = `
        <div class="search-history">
          <p class="search-history-title">搜索历史</p>
          <div class="history-list"></div>
          <button class="clear-history">清空历史记录</button>
        </div>
        <div class="search-results"></div>
        <div class="no-results" style="display: none;">
          <span class="icon">🔍</span>
          <p>未找到相关内容，请尝试其他关键词</p>
        </div>
      `;
      
      searchContainer.appendChild(this.resultsPanel);
    },
    
    // 增强搜索输入框
    enhanceSearchInput: function() {
      if (!this.searchInput) return;
      
      // 更新占位符文本
      this.searchInput.setAttribute('placeholder', '搜索文档内容...');
      
      // 绑定事件
      this.searchInput.addEventListener('focus', () => this.showResults());
      this.searchInput.addEventListener('input', (e) => this.handleInput(e));
      this.searchInput.addEventListener('keydown', (e) => this.handleKeydown(e));
      
      // 点击外部关闭结果面板
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.search')) {
          this.hideResults();
        }
      });
    },
    
    // 绑定事件
    bindEvents: function() {
      // 监听 Docsify 搜索结果更新
      this.interceptSearchResults();
    },
    
    // 拦截并增强原生搜索结果
    interceptSearchResults: function() {
      // 等待搜索插件加载完成
      setTimeout(() => {
        const originalResultsContainer = document.querySelector('.results-panel .search-results');
        if (originalResultsContainer) {
          // 创建观察者监听搜索结果变化
          const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
              if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                this.enhanceSearchResults();
              }
            });
          });
          
          // 监听侧边栏的搜索结果
          const sidebarResults = document.querySelector('.results-panel');
          if (sidebarResults) {
            observer.observe(sidebarResults.parentNode, {
              childList: true,
              subtree: true
            });
          }
        }
      }, 1000);
    },
    
    // 处理输入事件
    handleInput: function(e) {
      const query = e.target.value.trim();
      
      if (query.length === 0) {
        this.showSearchHistory();
        return;
      }
      
      if (query.length < 2) {
        this.hideResults();
        return;
      }
      
      // 防抖搜索
      clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(() => {
        this.performSearch(query);
      }, 300);
    },
    
    // 处理键盘事件
    handleKeydown: function(e) {
      if (e.key === 'Enter') {
        const query = e.target.value.trim();
        if (query && query.length >= 2) {
          this.addToHistory(query);
          this.performSearch(query);
        }
      } else if (e.key === 'Escape') {
        this.hideResults();
      }
    },
    
    // 执行搜索
    performSearch: function(query) {
      // 这里会触发 Docsify 原生搜索
      // 我们主要是增强显示效果
      this.showResults();
      
      // 显示搜索统计
      this.updateSearchStats(query);
    },
    
    // 增强搜索结果显示
    enhanceSearchResults: function() {
      const originalResults = document.querySelectorAll('.matching-post');
      if (originalResults.length === 0) return;
      
      const resultsContainer = this.resultsPanel.querySelector('.search-results');
      const noResults = this.resultsPanel.querySelector('.no-results');
      
      resultsContainer.innerHTML = '';
      
      if (originalResults.length === 0) {
        noResults.style.display = 'block';
        return;
      }
      
      noResults.style.display = 'none';
      
      originalResults.forEach(result => {
        const enhancedResult = this.createEnhancedResult(result);
        resultsContainer.appendChild(enhancedResult);
      });
    },
    
    // 创建增强的搜索结果项
    createEnhancedResult: function(originalResult) {
      const link = originalResult.querySelector('a');
      const title = link ? link.textContent.trim() : '未知标题';
      const href = link ? link.getAttribute('href') : '#';
      const content = originalResult.querySelector('p')?.textContent.trim() || '';
      
      const resultItem = document.createElement('div');
      resultItem.className = 'search-result-item';
      resultItem.innerHTML = `
        <div class="result-title">${this.highlightKeywords(title)}</div>
        <div class="result-path">${href.replace('#/', '').replace('#', '') || '首页'}</div>
        <div class="result-content">${this.highlightKeywords(content)}</div>
      `;
      
      resultItem.addEventListener('click', () => {
        window.location.hash = href;
        this.hideResults();
      });
      
      return resultItem;
    },
    
    // 高亮关键词
    highlightKeywords: function(text) {
      if (!this.searchInput || !this.searchInput.value) return text;
      
      const query = this.searchInput.value.trim();
      if (query.length < 2) return text;
      
      const keywords = query.split(/\s+/).filter(word => word.length >= 2);
      let highlightedText = text;
      
      keywords.forEach(keyword => {
        const regex = new RegExp(`(${keyword})`, 'gi');
        highlightedText = highlightedText.replace(regex, '<span class="result-highlight">$1</span>');
      });
      
      return highlightedText;
    },
    
    // 更新搜索统计
    updateSearchStats: function(query) {
      let statsContainer = this.resultsPanel.querySelector('.search-stats');
      if (!statsContainer) {
        statsContainer = document.createElement('div');
        statsContainer.className = 'search-stats';
        this.resultsPanel.insertBefore(statsContainer, this.resultsPanel.firstChild);
      }
      
      const resultCount = document.querySelectorAll('.matching-post').length;
      statsContainer.textContent = `搜索 "${query}" 找到 ${resultCount} 个结果`;
    },
    
    // 显示搜索历史
    showSearchHistory: function() {
      const historyContainer = this.resultsPanel.querySelector('.search-history');
      const resultsContainer = this.resultsPanel.querySelector('.search-results');
      const noResults = this.resultsPanel.querySelector('.no-results');
      
      historyContainer.style.display = this.searchHistory.length > 0 ? 'block' : 'none';
      resultsContainer.style.display = 'none';
      noResults.style.display = 'none';
      
      this.updateHistoryDisplay();
      this.showResults();
    },
    
    // 更新历史记录显示
    updateHistoryDisplay: function() {
      const historyList = this.resultsPanel.querySelector('.history-list');
      if (!historyList) return;
      
      historyList.innerHTML = '';
      
      this.searchHistory.forEach((item, index) => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = `
          <span class="text">${item}</span>
          <button class="delete-btn" data-index="${index}">×</button>
        `;
        
        historyItem.querySelector('.text').addEventListener('click', () => {
          this.searchInput.value = item;
          this.performSearch(item);
        });
        
        historyItem.querySelector('.delete-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          this.removeFromHistory(index);
        });
        
        historyList.appendChild(historyItem);
      });
      
      // 清空历史按钮事件
      const clearButton = this.resultsPanel.querySelector('.clear-history');
      if (clearButton) {
        clearButton.onclick = () => this.clearHistory();
      }
    },
    
    // 添加到搜索历史
    addToHistory: function(query) {
      if (!query || query.length < 2) return;
      
      // 移除重复项
      const index = this.searchHistory.indexOf(query);
      if (index > -1) {
        this.searchHistory.splice(index, 1);
      }
      
      // 添加到开头
      this.searchHistory.unshift(query);
      
      // 限制历史记录数量
      if (this.searchHistory.length > this.MAX_HISTORY_ITEMS) {
        this.searchHistory = this.searchHistory.slice(0, this.MAX_HISTORY_ITEMS);
      }
      
      this.saveSearchHistory();
    },
    
    // 从历史记录中移除
    removeFromHistory: function(index) {
      this.searchHistory.splice(index, 1);
      this.saveSearchHistory();
      this.updateHistoryDisplay();
    },
    
    // 清空历史记录
    clearHistory: function() {
      this.searchHistory = [];
      this.saveSearchHistory();
      this.updateHistoryDisplay();
    },
    
    // 加载搜索历史
    loadSearchHistory: function() {
      try {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        this.searchHistory = saved ? JSON.parse(saved) : [];
      } catch (e) {
        console.warn('无法加载搜索历史:', e);
        this.searchHistory = [];
      }
    },
    
    // 保存搜索历史
    saveSearchHistory: function() {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.searchHistory));
      } catch (e) {
        console.warn('无法保存搜索历史:', e);
      }
    },
    
    // 显示结果面板
    showResults: function() {
      if (this.resultsPanel) {
        this.resultsPanel.classList.add('show');
      }
    },
    
    // 隐藏结果面板
    hideResults: function() {
      if (this.resultsPanel) {
        this.resultsPanel.classList.remove('show');
      }
    }
  };
  
  // 初始化增强搜索
  window.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
      EnhancedSearch.init();
    }, 1000); // 等待 Docsify 搜索插件加载完成
  });
  
  // Docsify 钩子
  if (typeof window.$docsify !== 'undefined') {
    window.$docsify.plugins = window.$docsify.plugins || [];
    window.$docsify.plugins.push(function(hook) {
      hook.ready(function() {
        setTimeout(() => {
          EnhancedSearch.init();
        }, 500);
      });
    });
  }
  
  // 暴露到全局作用域
  window.EnhancedSearch = EnhancedSearch;
  
})();

// ========== 增强代码块功能 ==========
(function() {
  'use strict';
  
  const EnhancedCodeBlock = {
    
    // 初始化代码块增强
    init: function() {
      this.addLanguageLabels();
      this.addClickToCopy(); // 添加点击代码块复制功能
      this.bindEvents();
      return this;
    },
    
    // 添加语言标签
    addLanguageLabels: function() {
      const codeBlocks = document.querySelectorAll('pre code');
      
      codeBlocks.forEach(code => {
        const preElement = code.parentElement;
        if (!preElement || preElement.hasAttribute('data-lang')) return;
        
        // 从类名中提取语言信息
        const className = code.className || '';
        const langMatch = className.match(/(?:lang-|language-)([^\s]+)/);
        
        if (langMatch) {
          let language = langMatch[1].toLowerCase();
          
          // 语言映射
          const languageMap = {
            'js': 'JavaScript',
            'javascript': 'JavaScript',
            'ts': 'TypeScript',
            'typescript': 'TypeScript',
            'py': 'Python',
            'python': 'Python',
            'java': 'Java',
            'cpp': 'C++',
            'c++': 'C++',
            'csharp': 'C#',
            'cs': 'C#',
            'php': 'PHP',
            'rb': 'Ruby',
            'ruby': 'Ruby',
            'go': 'Go',
            'golang': 'Go',
            'rust': 'Rust',
            'rs': 'Rust',
            'swift': 'Swift',
            'kotlin': 'Kotlin',
            'kt': 'Kotlin',
            'html': 'HTML',
            'css': 'CSS',
            'scss': 'SCSS',
            'sass': 'Sass',
            'less': 'Less',
            'stylus': 'Stylus',
            'json': 'JSON',
            'xml': 'XML',
            'yaml': 'YAML',
            'yml': 'YAML',
            'toml': 'TOML',
            'ini': 'INI',
            'sql': 'SQL',
            'bash': 'Bash',
            'sh': 'Shell',
            'shell': 'Shell',
            'powershell': 'PowerShell',
            'ps1': 'PowerShell',
            'cmd': 'CMD',
            'batch': 'Batch',
            'dockerfile': 'Dockerfile',
            'makefile': 'Makefile',
            'nginx': 'Nginx',
            'apache': 'Apache',
            'markdown': 'Markdown',
            'md': 'Markdown',
            'tex': 'LaTeX',
            'latex': 'LaTeX',
            'r': 'R',
            'matlab': 'MATLAB',
            'm': 'MATLAB',
            'perl': 'Perl',
            'pl': 'Perl',
            'lua': 'Lua',
            'vim': 'Vim',
            'diff': 'Diff',
            'patch': 'Patch',
            'git': 'Git',
            'log': 'Log'
          };
          
          const displayName = languageMap[language] || language.toUpperCase();
          preElement.setAttribute('data-lang', displayName);
        }
      });
    },
    
    // 复制按钮已完全移除 - 保留此处作为占位符，专注于点击复制功能
    
    // 复制按钮功能已移除，专注于点击复制体验
    
    // 添加点击代码块复制功能
    addClickToCopy: function() {
      // 为所有代码块添加点击复制功能（支持触摸设备）
      const handleCodeClick = (e) => {
        // 检查点击的是否是代码块内容区域
        const codeElement = e.target.closest('pre code');
        const preElement = e.target.closest('pre');
        
        if (codeElement && preElement) {
          // 复制按钮已完全移除，直接处理点击复制
          
          // 添加点击视觉反馈
          this.addClickFeedback(preElement);
          
          // 复制代码
          const codeText = codeElement.textContent || codeElement.innerText;
          this.copyToClipboard(codeText)
            .then(() => {
              this.showCopySuccessToast('点击复制成功');
            })
            .catch((err) => {
              console.warn('复制失败:', err);
              this.showCopySuccessToast('复制失败', 'error');
            });
        }
      };
      
      // 添加点击和触摸事件监听
      document.addEventListener('click', handleCodeClick);
      
      // 移动设备触摸支持
      document.addEventListener('touchend', (e) => {
        // 防止触摸滚动时触发复制
        if (e.changedTouches && e.changedTouches.length === 1) {
          const touch = e.changedTouches[0];
          const element = document.elementFromPoint(touch.clientX, touch.clientY);
          if (element && element.closest('pre code')) {
            handleCodeClick({
              target: element,
              preventDefault: () => e.preventDefault()
            });
          }
        }
      }, { passive: false });
      
      // 为代码块添加悬停提示
      this.addHoverIndicator();
    },
    
    // 复制到剪贴板
    copyToClipboard: async function(text) {
      if (navigator.clipboard && window.isSecureContext) {
        // 现代浏览器使用 Clipboard API
        return navigator.clipboard.writeText(text);
      } else {
        // 降级到传统方法
        return new Promise((resolve, reject) => {
          const textArea = document.createElement('textarea');
          textArea.value = text;
          textArea.style.position = 'absolute';
          textArea.style.opacity = '0';
          textArea.style.left = '-999999px';
          textArea.style.top = '-999999px';
          document.body.appendChild(textArea);
          
          try {
            textArea.focus();
            textArea.select();
            const result = document.execCommand('copy');
            document.body.removeChild(textArea);
            
            if (result) {
              resolve();
            } else {
              reject(new Error('execCommand复制失败'));
            }
          } catch (err) {
            document.body.removeChild(textArea);
            reject(err);
          }
        });
      }
    },
    
    // 添加点击视觉反馈
    addClickFeedback: function(preElement) {
      // 移除已存在的反馈效果
      preElement.classList.remove('code-click-feedback');
      
      // 添加反馈效果
      preElement.classList.add('code-click-feedback');
      
      // 短暂后移除效果
      setTimeout(() => {
        preElement.classList.remove('code-click-feedback');
      }, 300);
    },
    
    // 添加悬停指示器
    addHoverIndicator: function() {
      // 使用 MutationObserver 监听新增的代码块
      if (typeof MutationObserver !== 'undefined') {
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === 1 && node.tagName === 'PRE') {
                this.addCodeBlockIndicator(node);
              }
            });
          });
        });
        
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
      }
      
      // 为现有代码块添加指示器
      document.querySelectorAll('pre code').forEach(codeElement => {
        const preElement = codeElement.closest('pre');
        if (preElement) {
          this.addCodeBlockIndicator(preElement);
        }
      });
    },
    
    // 为代码块添加悬停指示器
    addCodeBlockIndicator: function(preElement) {
      if (preElement.hasAttribute('data-click-copy-added')) {
        return; // 避免重复添加
      }
      
      preElement.setAttribute('data-click-copy-added', 'true');
      preElement.style.cursor = 'pointer';
      preElement.title = '点击复制代码';
      
      // 添加悬停效果
      const originalTransition = preElement.style.transition;
      preElement.style.transition = 'all 0.2s ease';
      
      preElement.addEventListener('mouseenter', () => {
        preElement.style.transform = 'translateY(-1px)';
        preElement.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
      });
      
      preElement.addEventListener('mouseleave', () => {
        preElement.style.transform = '';
        preElement.style.boxShadow = '';
      });
      
      // 移动设备触摸反馈
      preElement.addEventListener('touchstart', () => {
        preElement.style.backgroundColor = 'rgba(66, 185, 131, 0.05)';
      }, { passive: true });
      
      preElement.addEventListener('touchend', () => {
        setTimeout(() => {
          preElement.style.backgroundColor = '';
        }, 150);
      }, { passive: true });
    },
    
    // 显示复制成功提示
    showCopySuccessToast: function(message = '已复制', type = 'success') {
      // 移除现有的提示
      const existingToast = document.querySelector('.copy-success-toast');
      if (existingToast) {
        existingToast.remove();
      }
      
      // 创建新的提示
      const toast = document.createElement('div');
      toast.className = `copy-success-toast ${type === 'error' ? 'error' : 'success'}`;
      
      const icon = type === 'error' ? '✗' : '✓';
      toast.innerHTML = `<span style="margin-right: 6px;">${icon}</span>${message}`;
      
      document.body.appendChild(toast);
      
      // 显示动画
      requestAnimationFrame(() => {
        toast.classList.add('show');
      });
      
      // 隐藏动画
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
          if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
          }
        }, 300);
      }, type === 'error' ? 2500 : 1800); // 错误提示显示更久
      
      // 触觉反馈（如果支持）
      if (navigator.vibrate && type === 'success') {
        navigator.vibrate([50]); // 成功时的轻微震动
      }
    },
    
    // 绑定事件
    bindEvents: function() {
      // 监听路由变化，重新处理代码块
      window.addEventListener('hashchange', () => {
        setTimeout(() => {
          this.addLanguageLabels();
        }, 100);
      });
      
      // 监听DOM变化
      if (typeof MutationObserver !== 'undefined') {
        const observer = new MutationObserver((mutations) => {
          let shouldUpdate = false;
          
          mutations.forEach((mutation) => {
            if (mutation.addedNodes) {
              mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1) { // Element node
                  // 检查是否添加了代码块
                  if (node.tagName === 'PRE' || 
                      node.querySelector && node.querySelector('pre code')) {
                    shouldUpdate = true;
                  }
                }
              });
            }
          });
          
          if (shouldUpdate) {
            setTimeout(() => {
              this.addLanguageLabels();
            }, 50);
          }
        });
        
        // 开始观察
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
      }
    },
    
    // 添加代码块工具栏
    addCodeToolbar: function(preElement, language) {
      if (preElement.querySelector('.code-toolbar')) return;
      
      const toolbar = document.createElement('div');
      toolbar.className = 'code-toolbar';
      toolbar.innerHTML = `
        <div class="code-info">
          <span class="code-language">${language}</span>
          <span class="code-lines">${this.countLines(preElement)} 行</span>
        </div>
        <div class="code-actions">
          <button class="code-action-btn" data-action="wrap" title="切换换行">
            <svg width="14" height="14" viewBox="0 0 24 24">
              <path fill="currentColor" d="M4,6V8H16V6H4M4,10V12H16V10H4M4,14V16H10V14H4M20,14V16H12V14H20M20.5,12H16V10.5L20,7V4H12V6H18V7.5L14.5,11H20.5V12Z"/>
            </svg>
          </button>
          <button class="code-action-btn" data-action="fullscreen" title="全屏显示">
            <svg width="14" height="14" viewBox="0 0 24 24">
              <path fill="currentColor" d="M5,5H10V7H7V10H5V5M14,5H19V10H17V7H14V5M17,14H19V19H14V17H17V14M10,17V19H5V14H7V17H10Z"/>
            </svg>
          </button>
        </div>
      `;
      
      preElement.style.position = 'relative';
      preElement.insertBefore(toolbar, preElement.firstChild);
    },
    
    // 计算代码行数
    countLines: function(preElement) {
      const code = preElement.querySelector('code');
      if (!code) return 0;
      
      return (code.textContent.match(/\n/g) || []).length + 1;
    }
  };
  
  // 初始化代码块增强
  window.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
      EnhancedCodeBlock.init();
    }, 500);
  });
  
  window.addEventListener('load', function() {
    setTimeout(() => {
      EnhancedCodeBlock.addLanguageLabels();
    }, 1000);
  });
  
  // Docsify 钩子
  if (typeof window.$docsify !== 'undefined') {
    window.$docsify.plugins = window.$docsify.plugins || [];
    window.$docsify.plugins.push(function(hook) {
      hook.doneEach(function() {
        setTimeout(() => {
          EnhancedCodeBlock.addLanguageLabels();
        }, 100);
      });
      
      hook.ready(function() {
        setTimeout(() => {
          EnhancedCodeBlock.init();
        }, 500);
      });
    });
  }
  
  // 暴露到全局作用域
  window.EnhancedCodeBlock = EnhancedCodeBlock;
  
})();

// ========== 移动端体验优化 ==========
(function() {
  'use strict';
  
  const MobileEnhancement = {
    isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
    
    // 触摸事件追踪
    touchStartX: 0,
    touchStartY: 0,
    touchEndX: 0,
    touchEndY: 0,
    
    // 手势状态
    isGestureActive: false,
    gestureThreshold: 100, // 手势触发阈值
    
    // 初始化移动端增强
    init: function() {
      if (!this.isMobile && window.innerWidth > 768) return;
      
      this.initTouchGestures();
      this.initAccessibility();
      this.initMobileOptimizations();
      return this;
    },
    
    // 初始化触摸手势
    initTouchGestures: function() {
      const gestureOverlay = document.getElementById('gesture-overlay');
      const content = document.querySelector('.content');
      
      if (!gestureOverlay || !content) return;
      
      // 绑定触摸事件
      document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
      document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
      document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
      
      // 显示手势提示
      this.showSwipeHint();
    },
    
    // 处理触摸开始
    handleTouchStart: function(e) {
      // 只在边缘区域响应手势
      if (e.touches[0].clientX > 50) return;
      
      this.touchStartX = e.touches[0].clientX;
      this.touchStartY = e.touches[0].clientY;
      this.isGestureActive = true;
      
      const gestureOverlay = document.getElementById('gesture-overlay');
      if (gestureOverlay) {
        gestureOverlay.classList.add('active');
      }
    },
    
    // 处理触摸移动
    handleTouchMove: function(e) {
      if (!this.isGestureActive) return;
      
      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const deltaX = currentX - this.touchStartX;
      const deltaY = currentY - this.touchStartY;
      
      // 检查是否是水平滑动
      if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX > 30) {
        e.preventDefault();
        
        // 实时更新内容位置（预览效果）
        const content = document.querySelector('.content');
        if (content) {
          content.classList.add('swiping');
          const translateX = Math.min(deltaX * 0.3, 80); // 限制最大移动距离
          content.style.transform = `translateX(${translateX}px)`;
        }
      }
    },
    
    // 处理触摸结束
    handleTouchEnd: function(e) {
      if (!this.isGestureActive) return;
      
      this.touchEndX = e.changedTouches[0].clientX;
      this.touchEndY = e.changedTouches[0].clientY;
      
      this.handleGesture();
      this.resetGesture();
    },
    
    // 处理手势
    handleGesture: function() {
      const deltaX = this.touchEndX - this.touchStartX;
      const deltaY = this.touchEndY - this.touchStartY;
      
      // 水平滑动距离大于阈值且垂直滑动距离较小
      if (Math.abs(deltaX) > this.gestureThreshold && Math.abs(deltaY) < 100) {
        if (deltaX > 0) {
          // 右滑：打开侧边栏
          this.openSidebar();
        }
        // 左滑在这个场景下不处理（可以用于关闭侧边栏）
      }
    },
    
    // 重置手势状态
    resetGesture: function() {
      this.isGestureActive = false;
      
      const gestureOverlay = document.getElementById('gesture-overlay');
      const content = document.querySelector('.content');
      
      if (gestureOverlay) {
        gestureOverlay.classList.remove('active');
      }
      
      if (content) {
        content.classList.remove('swiping');
        content.style.transform = '';
      }
    },
    
    // 打开侧边栏
    openSidebar: function() {
      const body = document.body;
      const sidebarToggle = document.querySelector('.sidebar-toggle');
      
      if (body) {
        body.classList.add('close');
      }
      
      // 触觉反馈（如果支持）
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    },
    
    // 显示滑动提示
    showSwipeHint: function() {
      const swipeHint = document.getElementById('swipe-hint');
      if (!swipeHint) return;
      
      // 检查是否已经显示过提示
      const hasShownHint = localStorage.getItem('swipe-hint-shown');
      if (hasShownHint) return;
      
      setTimeout(() => {
        swipeHint.classList.add('show');
        
        setTimeout(() => {
          swipeHint.classList.remove('show');
          localStorage.setItem('swipe-hint-shown', 'true');
        }, 3000);
      }, 2000);
    },
    
    // 初始化可访问性增强
    initAccessibility: function() {
      // 为交互元素添加ARIA标签
      this.addARIALabels();
      
      // 为动态内容添加live region
      this.addLiveRegions();
      
      // 增强键盘导航
      this.enhanceKeyboardNavigation();
    },
    
    // 添加ARIA标签
    addARIALabels: function() {
      // 主题切换按钮
      const themeToggle = document.getElementById('theme-toggle');
      if (themeToggle) {
        themeToggle.setAttribute('aria-label', '切换深色/浅色主题');
        themeToggle.setAttribute('role', 'switch');
        themeToggle.setAttribute('aria-checked', 'false');
      }
      
      // 返回顶部按钮
      const backToTop = document.getElementById('custom-back-to-top');
      if (backToTop) {
        backToTop.setAttribute('aria-label', '返回页面顶部');
        backToTop.setAttribute('role', 'button');
        backToTop.setAttribute('tabindex', '0');
      }
      
      // 侧边栏切换
      const sidebarToggle = document.querySelector('.sidebar-toggle');
      if (sidebarToggle) {
        sidebarToggle.setAttribute('aria-label', '切换侧边栏');
        sidebarToggle.setAttribute('aria-expanded', 'false');
      }
      
      // 搜索输入框
      const searchInput = document.querySelector('.search input');
      if (searchInput) {
        searchInput.setAttribute('aria-label', '搜索文档内容');
        searchInput.setAttribute('role', 'searchbox');
      }
    },
    
    // 添加live regions
    addLiveRegions: function() {
      // 创建状态更新区域
      const statusRegion = document.createElement('div');
      statusRegion.id = 'status-region';
      statusRegion.className = 'sr-only';
      statusRegion.setAttribute('aria-live', 'polite');
      statusRegion.setAttribute('aria-atomic', 'true');
      document.body.appendChild(statusRegion);
      
      // 创建通知区域
      const alertRegion = document.createElement('div');
      alertRegion.id = 'alert-region';
      alertRegion.className = 'sr-only';
      alertRegion.setAttribute('aria-live', 'assertive');
      alertRegion.setAttribute('aria-atomic', 'true');
      document.body.appendChild(alertRegion);
    },
    
    // 增强键盘导航
    enhanceKeyboardNavigation: function() {
      // ESC键关闭模态和面板
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          // 关闭搜索结果面板
          const resultsPanel = document.querySelector('.results-panel');
          if (resultsPanel && resultsPanel.classList.contains('show')) {
            resultsPanel.classList.remove('show');
          }
          
          // 关闭侧边栏
          const body = document.body;
          if (body && body.classList.contains('close')) {
            body.classList.remove('close');
          }
        }
      });
      
      // Tab键循环焦点
      this.trapFocus();
    },
    
    // 焦点陷阱（用于模态框等）
    trapFocus: function() {
      const focusableSelectors = [
        'a[href]',
        'button:not([disabled])',
        'input:not([disabled])',
        'textarea:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])'
      ].join(',');
      
      document.addEventListener('keydown', (e) => {
        if (e.key !== 'Tab') return;
        
        const focusableElements = document.querySelectorAll(focusableSelectors);
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      });
    },
    
    // 移动端优化
    initMobileOptimizations: function() {
      // 防止双击缩放
      this.preventDoubleTabZoom();
      
      // 优化滚动
      this.optimizeScrolling();
      
      // 处理屏幕方向变化
      this.handleOrientationChange();
    },
    
    // 防止双击缩放
    preventDoubleTabZoom: function() {
      let lastTap = 0;
      document.addEventListener('touchend', (e) => {
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;
        if (tapLength < 500 && tapLength > 0) {
          e.preventDefault();
        }
        lastTap = currentTime;
      }, { passive: false });
    },
    
    // 优化滚动
    optimizeScrolling: function() {
      // 添加滚动动量
      const scrollableElements = document.querySelectorAll('.sidebar, .search-results, .page_toc, .toc-nav');
      scrollableElements.forEach(element => {
        element.style.webkitOverflowScrolling = 'touch';
      });
    },
    
    // 处理屏幕方向变化
    handleOrientationChange: function() {
      window.addEventListener('orientationchange', () => {
        setTimeout(() => {
          // 重新计算布局
          window.dispatchEvent(new Event('resize'));
          
          // 滚动到当前位置以修复可能的布局问题
          const currentY = window.pageYOffset;
          window.scrollTo(0, currentY);
        }, 500);
      });
    },
    
    // 公告状态更新
    announceStatus: function(message) {
      const statusRegion = document.getElementById('status-region');
      if (statusRegion) {
        statusRegion.textContent = message;
      }
    },
    
    // 公告警告信息
    announceAlert: function(message) {
      const alertRegion = document.getElementById('alert-region');
      if (alertRegion) {
        alertRegion.textContent = message;
      }
    }
  };
  
  // 初始化移动端增强
  window.addEventListener('DOMContentLoaded', function() {
    MobileEnhancement.init();
  });
  
  // 监听主题变更，更新ARIA状态
  window.addEventListener('themechange', function(e) {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.setAttribute('aria-checked', e.detail.theme === 'dark' ? 'true' : 'false');
    }
    
    MobileEnhancement.announceStatus(`已切换到${e.detail.theme === 'dark' ? '深色' : '浅色'}主题`);
  });
  
  // 暴露到全局作用域
  window.MobileEnhancement = MobileEnhancement;
  
})();

// 页面加载完成后的初始化
window.addEventListener('load', function() {
  
  // 获取开始阅读按钮
  var startButton = document.getElementById('start-reading-btn');
  
  if (startButton) {
    // 处理开始阅读功能
    function handleStartReading() {
      var customCover = document.getElementById('custom-cover');
      
      if (customCover) {
        // 添加平滑过渡效果
        customCover.style.transition = 'opacity 0.8s ease-in-out';
        customCover.style.opacity = '0';
        
        // 延迟后完全隐藏封面
        setTimeout(function() {
          customCover.style.display = 'none';
          
          // 确保侧边栏切换按钮在移动端可见
          if (window.innerWidth <= 768) {
            var sidebarToggle = document.querySelector('.sidebar-toggle');
            if (sidebarToggle) {
              sidebarToggle.style.display = 'block';
              sidebarToggle.style.visibility = 'visible';
              sidebarToggle.style.opacity = '1';
            }
          }
        }, 800);
      }
    }
    
    // 使用 onclick 方式处理，这是最兼容的方式
    startButton.onclick = function(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      handleStartReading();
      return false;
    };
    
    // 同时添加事件监听器作为备用
    startButton.addEventListener('click', function(e) {
      e.preventDefault();
      handleStartReading();
    }, false);
    
    // 确保按钮可点击
    startButton.style.cursor = 'pointer';
    startButton.style.pointerEvents = 'auto';
  }
  
  // 自定义返回顶部按钮功能
  var backToTopBtn = document.getElementById('custom-back-to-top');
  
  if (backToTopBtn) {
    // 滚动事件监听，控制按钮显示和隐藏
    window.addEventListener('scroll', function() {
      if (window.pageYOffset > 300) {
        backToTopBtn.style.opacity = '1';
      } else {
        backToTopBtn.style.opacity = '0';
      }
    });
    
    // 点击返回顶部
    backToTopBtn.addEventListener('click', function() {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }
});

// 给侧边栏文档链接添加手型指针样式
window.addEventListener('load', function() {
  setTimeout(function() {
    var sidebarLinks = document.querySelectorAll('.sidebar-nav a');
    sidebarLinks.forEach(function(link) {
      link.style.cursor = 'pointer';
    });
  }, 1000);
});

// 调试开关 - 在控制台输入 window.tocDebug = true 来开启调试
// 或者 window.tocDebug = false 来关闭调试
if (typeof window.tocDebug === 'undefined') {
  window.tocDebug = false;
}


// 文章目录自动滚动跟随功能
function initTOCScrollFollow() {
  // 更全面地查找目录元素，包括插件生成的所有可能选择器
  var tocSelectors = [
    '.page_toc a',           // docsify-plugin-toc 主要选择器
    '.toc-nav a',            // 备用选择器
    'aside.toc-nav a',       // aside 标签
    '.page_toc li a',        // 嵌套列表项
    '.toc-container a',      // 容器内链接
    '.toc-wrapper a'         // 包装器内链接
  ];
  
  var containerSelectors = [
    '.page_toc',
    'aside.toc-nav', 
    '.toc-nav',
    '.toc-container',
    '.toc-wrapper'
  ];
  
  var tocLinks = [];
  var tocContainer = null;
  
  // 逐个尝试选择器
  for (var i = 0; i < tocSelectors.length; i++) {
    var links = document.querySelectorAll(tocSelectors[i]);
    if (links.length > 0) {
      tocLinks = links;
      if (window.tocDebug) {
        console.log('✓ 找到目录链接:', tocSelectors[i], '数量:', links.length);
      }
      break;
    }
  }
  
  for (var j = 0; j < containerSelectors.length; j++) {
    var container = document.querySelector(containerSelectors[j]);
    if (container) {
      tocContainer = container;
      if (window.tocDebug) {
        console.log('✓ 找到目录容器:', containerSelectors[j]);
      }
      break;
    }
  }
  
  // 检查是否在小屏幕上被隐藏
  if (window.innerWidth <= 360) {
    return;
  }
  
  // 限制重试次数
  if (!window.tocInitRetries) {
    window.tocInitRetries = 0;
  }
  window.tocInitRetries++;
  
  if (!tocLinks.length && window.tocInitRetries < 20) {
    setTimeout(initTOCScrollFollow, 500);
    return;
  }
  
  if (!tocContainer && window.tocInitRetries < 20) {
    setTimeout(initTOCScrollFollow, 500);
    return;
  }
  
  if (window.tocInitRetries >= 20) {
    return;
  }
  
  // 获取所有标题元素
  function getAllHeadings() {
    var headings = [];
    var selectors = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']; // 包含h1
    
    selectors.forEach(function(selector) {
      var elements = document.querySelectorAll('.markdown-section ' + selector);
      
      elements.forEach(function(el) {
        if (el.id) {
          var offsetTop = el.getBoundingClientRect().top + window.pageYOffset;
          headings.push({
            id: el.id,
            element: el,
            offsetTop: offsetTop
          });
        }
      });
    });
    
    // 按位置排序
    headings.sort(function(a, b) {
      return a.offsetTop - b.offsetTop;
    });
    
    return headings;
  }
  
  // 查找当前可见的标题 - 优化版本
  function getCurrentHeading() {
    var headings = getAllHeadings();
    if (!headings.length) {
      return null;
    }
    
    var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    var viewportHeight = window.innerHeight;
    var offsetThreshold = Math.min(viewportHeight * 0.3, 200); // 动态阈值，最大200px
    
    var currentHeading = null;
    var bestMatch = null;
    var minDistance = Infinity;
    
    // 寻找最佳匹配的标题
    for (var i = 0; i < headings.length; i++) {
      var heading = headings[i];
      var rect = heading.element.getBoundingClientRect();
      var headingTop = rect.top + scrollTop;
      var headingBottom = headingTop + rect.height;
      
      // 检查标题是否在视口上部可见区域
      if (rect.top <= offsetThreshold && rect.bottom >= 0) {
        var distance = Math.abs(rect.top);
        if (distance < minDistance) {
          minDistance = distance;
          bestMatch = heading;
        }
      }
      
      // 备用逻辑：找到滚动位置上方最近的标题
      if (headingTop <= scrollTop + offsetThreshold) {
        currentHeading = heading;
      }
    }
    
    // 优先使用视口内的最佳匹配，否则使用备用逻辑
    var result = bestMatch || currentHeading || headings[0];
    return result;
  }
  
  // 更新目录高亮和滚动位置
  function updateTOC() {
    var currentHeading = getCurrentHeading();
    if (!currentHeading) {
      return;
    }
    
    // 移除所有激活状态
    tocLinks.forEach(function(link) {
      link.classList.remove('active');
      if (link.parentElement) {
        link.parentElement.classList.remove('active');
      }
    });
    
    // 找到对应的目录链接 - 增强匹配逻辑
    var activeLink = null;
    var targetId = currentHeading.id;
    var targetText = currentHeading.element.textContent.trim();
    
    tocLinks.forEach(function(link) {
      var href = link.getAttribute('href');
      var linkText = link.textContent.trim();
      
      if (href) {
        // 提取链接ID，处理多种格式
        var linkId = href.replace(/^.*#/, '').replace(/^\?id=/, '');
        
        // 多种匹配策略
        var isMatch = false;
        
        // 1. ID完全匹配
        if (linkId === targetId) {
          isMatch = true;
        }
        
        // 2. 文本内容匹配（去除特殊字符）
        if (!isMatch && linkText && targetText) {
          var normalizedLinkText = linkText.replace(/[^\w\s\u4e00-\u9fa5]/g, '').trim();
          var normalizedTargetText = targetText.replace(/[^\w\s\u4e00-\u9fa5]/g, '').trim();
          
          if (normalizedLinkText === normalizedTargetText) {
            isMatch = true;
          }
        }
        
        // 3. URL解码后的ID匹配
        if (!isMatch) {
          try {
            var decodedLinkId = decodeURIComponent(linkId);
            if (decodedLinkId === targetId) {
              isMatch = true;
            }
          } catch (e) {
            // 忽略解码错误
          }
        }
        
        if (isMatch) {
          link.classList.add('active');
          if (link.parentElement) {
            link.parentElement.classList.add('active');
          }
          activeLink = link;
          
          // 调试信息（可在控制台查看）
          if (window.tocDebug) {
            console.log('✅ TOC匹配成功:', {
              标题ID: targetId,
              标题文本: targetText,
              目录链接: linkText,
              链接ID: linkId
            });
          }
        }
      }
    });
    
    // 智能滚动目录，使当前项保持在合适位置
    if (activeLink && tocContainer) {
      try {
        // 首先尝试使用 scrollIntoView (现代浏览器支持)
        if (activeLink.scrollIntoView && typeof activeLink.scrollIntoView === 'function') {
          // 检查是否需要滚动
          var linkRect = activeLink.getBoundingClientRect();
          var containerRect = tocContainer.getBoundingClientRect();
          var linkInContainer = (
            linkRect.top >= containerRect.top && 
            linkRect.bottom <= containerRect.bottom
          );
          
          if (!linkInContainer) {
            activeLink.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
              inline: 'nearest'
            });
          }
        } else {
          // 降级到手动滚动逻辑
          var containerHeight = tocContainer.clientHeight || tocContainer.offsetHeight;
          var containerScrollHeight = tocContainer.scrollHeight;
          
          if (containerScrollHeight > containerHeight) {
            var linkRect = activeLink.getBoundingClientRect();
            var containerRect = tocContainer.getBoundingClientRect();
            
            var linkRelativeTop = linkRect.top - containerRect.top + tocContainer.scrollTop;
            var linkHeight = activeLink.offsetHeight || activeLink.clientHeight;
            
            // 将激活项放在容器上方 1/3 处，这样更自然
            var targetScrollTop = linkRelativeTop - (containerHeight / 3);
            
            var maxScrollTop = Math.max(0, containerScrollHeight - containerHeight);
            targetScrollTop = Math.max(0, Math.min(targetScrollTop, maxScrollTop));
            
            var currentScrollTop = tocContainer.scrollTop || 0;
            
            if (Math.abs(currentScrollTop - targetScrollTop) > 30) {
              if (tocContainer.scrollTo) {
                tocContainer.scrollTo({
                  top: targetScrollTop,
                  behavior: 'smooth'
                });
              } else {
                tocContainer.scrollTop = targetScrollTop;
              }
            }
          }
        }
      } catch (error) {
        console.warn('目录滚动出错:', error);
        // 静默处理错误，不影响其他功能
      }
    }
  }
  
  // 节流函数
  function throttle(func, wait) {
    var timeout;
    var previous = 0;
    
    return function() {
      var now = Date.now();
      var remaining = wait - (now - previous);
      var context = this;
      var args = arguments;
      
      if (remaining <= 0 || remaining > wait) {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        previous = now;
        func.apply(context, args);
      } else if (!timeout) {
        timeout = setTimeout(function() {
          previous = Date.now();
          timeout = null;
          func.apply(context, args);
        }, remaining);
      }
    };
  }
  
  // 使用适中的频率让跟随更流畅但不会造成性能问题
  var throttledUpdate = throttle(updateTOC, 150);
  
  // 添加滚动事件监听器
  window.addEventListener('scroll', throttledUpdate, { passive: true });
  
  // 监听窗口大小变化，重新初始化
  window.addEventListener('resize', throttle(function() {
    setTimeout(initTOCScrollFollow, 200);
  }, 500));
  
  // 初始更新
  setTimeout(function() {
    updateTOC();
  }, 300);
  
  // 监听路由变化和页面切换
  var handlePageChange = function() {
    setTimeout(function() {
      initTOCScrollFollow();
    }, 600);
  };
  
  window.addEventListener('hashchange', handlePageChange);
  window.addEventListener('popstate', handlePageChange);
  
  // 成功初始化的标记
  window.tocFollowInitialized = true;
  return true;
}

// 智能初始化策略 - 避免重复初始化
function smartInitTOC() {
  // 防止重复初始化
  if (window.tocFollowInitialized) {
    return;
  }
  
  // 检查必要元素是否存在
  var hasTOC = document.querySelector('.page_toc') || 
               document.querySelector('.toc-nav') || 
               document.querySelector('[class*="toc"]');
               
  var hasContent = document.querySelector('.markdown-section');
  
  if (hasTOC && hasContent) {
    initTOCScrollFollow();
  }
}

// 在多个关键时机尝试初始化
window.addEventListener('DOMContentLoaded', function() {
  setTimeout(smartInitTOC, 500);
});

window.addEventListener('load', function() {
  setTimeout(smartInitTOC, 800);
});

// 使用 MutationObserver 监听DOM变化
if (typeof MutationObserver !== 'undefined') {
  var tocObserver = new MutationObserver(function(mutations) {
    var shouldInit = false;
    
    mutations.forEach(function(mutation) {
      // 检查是否有新增的目录相关元素
      if (mutation.addedNodes) {
        for (var i = 0; i < mutation.addedNodes.length; i++) {
          var node = mutation.addedNodes[i];
          if (node.nodeType === 1 && // Element node
              (node.className && 
               (node.className.includes('toc') || 
                node.className.includes('page_toc')))) {
            shouldInit = true;
            break;
          }
        }
      }
    });
    
    if (shouldInit && !window.tocFollowInitialized) {
      setTimeout(smartInitTOC, 300);
    }
  });
  
  // 开始观察 - 确保 document.body 存在
  if (document.body) {
    tocObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  } else {
    // 如果 body 还没加载，等待 DOM 完成
    document.addEventListener('DOMContentLoaded', function() {
      if (document.body) {
        tocObserver.observe(document.body, {
          childList: true,
          subtree: true
        });
      }
    });
  }
}

// Docsify 插件钩子
if (typeof window.$docsify !== 'undefined') {
  window.$docsify.plugins = window.$docsify.plugins || [];
  window.$docsify.plugins.push(function(hook) {
    hook.doneEach(function() {
      // 重置初始化标记，允许重新初始化
      window.tocFollowInitialized = false;
      setTimeout(smartInitTOC, 400);
    });
    
    hook.ready(function() {
      setTimeout(smartInitTOC, 600);
    });
  });
}
