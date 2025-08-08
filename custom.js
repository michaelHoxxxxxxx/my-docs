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

// 自定义明暗模式切换功能
window.addEventListener('load', function() {
  // 等待更长时间确保 Docsify 完全加载
  setTimeout(function() {
    // 获取元素
    var themeToggle = document.getElementById('theme-toggle');
    var lightIcon = document.querySelector('.light-icon');
    var darkIcon = document.querySelector('.dark-icon');
    
    if (!themeToggle || !lightIcon || !darkIcon) {
      return; // 静默退出，避免错误日志
    }
    
    // 初始更新图标状态
    updateThemeIcons();
    
    // 添加点击事件
    themeToggle.addEventListener('click', function() {
      // 尝试找到并点击 Docsify 的原生主题切换按钮
      var darkmodeToggle = document.querySelector('.darkmode-toggle');
      if (darkmodeToggle) {
        darkmodeToggle.click();
      } else {
        // 如果找不到原生按钮，就手动切换
        manualToggleTheme();
      }
      
      // 更新图标状态
      setTimeout(updateThemeIcons, 100);
    });
    
    // 手动切换主题
    function manualToggleTheme() {
      // 检查当前主题
      var currentTheme = localStorage.getItem('DARK_LIGHT_THEME') || 'light';
      var newTheme = currentTheme === 'light' ? 'dark' : 'light';
      
      // 切换主题
      localStorage.setItem('DARK_LIGHT_THEME', newTheme);
      
      // 应用主题
      if (newTheme === 'dark') {
        document.body.classList.add('dark');
        document.body.classList.remove('light');
      } else {
        document.body.classList.add('light');
        document.body.classList.remove('dark');
      }
      
      // 应用主题样式
      applyThemeStyles(newTheme);
    }
    
    // 应用主题样式
    function applyThemeStyles(theme) {
      // 获取主题配置
      var config = window.$docsify.darklightTheme;
      if (!config) return;
      
      var themeConfig = theme === 'dark' ? config.dark : config.light;
      if (!themeConfig) return;
      
      // 应用所有主题样式
      document.documentElement.style.setProperty('--theme-color', themeConfig.accent || '#42b983');
      document.documentElement.style.setProperty('--background', themeConfig.background || '#ffffff');
      document.documentElement.style.setProperty('--text-color', themeConfig.textColor || '#34495e');
      
      // 触发主题变化事件
      var event = new Event('themeChange');
      document.dispatchEvent(event);
    }
    
    // 监听主题变化
    var observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.attributeName === 'class') {
          updateThemeIcons();
        }
      });
    });
    
    observer.observe(document.body, { attributes: true });
    
    // 更新图标状态
    function updateThemeIcons() {
      var isDark = document.body.classList.contains('dark');
      
      if (isDark) {
        lightIcon.style.display = 'none';
        darkIcon.style.display = 'block';
      } else {
        lightIcon.style.display = 'block';
        darkIcon.style.display = 'none';
      }
    }
    
    // 给侧边栏文档链接添加手型指针样式
    var sidebarLinks = document.querySelectorAll('.sidebar-nav a');
    sidebarLinks.forEach(function(link) {
      link.style.cursor = 'pointer';
    });
  }, 3000); // 增加等待时间到 3 秒
});

// 调试开关 - 在控制台输入 window.tocDebug = true 来开启调试
// 或者 window.tocDebug = false 来关闭调试
if (typeof window.tocDebug === 'undefined') {
  window.tocDebug = false;
}

// 移除插件生成的主题切换按钮
function removePluginThemeButton() {
  // 查找并移除所有可能的插件按钮
  var selectors = [
    '.darkmode-toggle',
    'button.darkmode-toggle', 
    '#dark-mode-toggle-button',
    'button[onclick*="switchTheme"]',
    'button[style*="position: fixed"][style*="right"]',
    'body > button[style*="fixed"]'
  ];
  
  selectors.forEach(function(selector) {
    var elements = document.querySelectorAll(selector);
    elements.forEach(function(el) {
      // 排除我们的自定义按钮
      if (el.id !== 'theme-toggle' && el.id !== 'custom-back-to-top') {
        el.remove();
      }
    });
  });
}

// 在多个时机尝试移除插件按钮
window.addEventListener('DOMContentLoaded', function() {
  setTimeout(removePluginThemeButton, 100);
  setTimeout(removePluginThemeButton, 500);
  setTimeout(removePluginThemeButton, 1000);
});

window.addEventListener('load', function() {
  setTimeout(removePluginThemeButton, 100);
  setTimeout(removePluginThemeButton, 1500);
  setTimeout(removePluginThemeButton, 3000);
});

// 使用 MutationObserver 监听新按钮的添加
if (typeof MutationObserver !== 'undefined') {
  var buttonObserver = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.addedNodes) {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType === 1 && node.tagName === 'BUTTON') {
            // 检查是否是主题切换按钮
            if (node.classList.contains('darkmode-toggle') || 
                (node.style && node.style.position === 'fixed' && 
                 node.id !== 'theme-toggle' && node.id !== 'custom-back-to-top')) {
              node.remove();
            }
          }
        });
      }
    });
  });
  
  // 开始观察
  if (document.body) {
    buttonObserver.observe(document.body, {
      childList: true,
      subtree: false // 只观察 body 的直接子元素
    });
  }
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
