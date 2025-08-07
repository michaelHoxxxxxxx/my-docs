// 页面加载完成后的初始化
window.addEventListener('load', function() {
  console.log('自定义脚本已加载');
  console.log('用户代理:', navigator.userAgent);
  console.log('是否为移动设备:', /Mobi|Android/i.test(navigator.userAgent));
  
  // 获取开始阅读按钮
  var startButton = document.getElementById('start-reading-btn');
  
  if (startButton) {
    // 处理开始阅读功能
    function handleStartReading() {
      console.log('开始阅读按钮被点击');
      var customCover = document.getElementById('custom-cover');
      
      if (customCover) {
        // 添加平滑过渡效果
        customCover.style.transition = 'opacity 0.8s ease-in-out';
        customCover.style.opacity = '0';
        
        // 延迟后完全隐藏封面
        setTimeout(function() {
          customCover.style.display = 'none';
          console.log('封面已隐藏');
          
          // 确保侧边栏切换按钮在移动端可见
          if (window.innerWidth <= 768) {
            var sidebarToggle = document.querySelector('.sidebar-toggle');
            if (sidebarToggle) {
              sidebarToggle.style.display = 'block';
              sidebarToggle.style.visibility = 'visible';
              sidebarToggle.style.opacity = '1';
              console.log('侧边栏切换按钮已显示');
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
  console.log('自定义明暗模式切换功能已加载');
  
  // 等待更长时间确保 Docsify 完全加载
  setTimeout(function() {
    // 获取元素
    var themeToggle = document.getElementById('theme-toggle');
    var lightIcon = document.querySelector('.light-icon');
    var darkIcon = document.querySelector('.dark-icon');
    
    if (!themeToggle) {
      console.error('找不到主题切换按钮');
      return;
    }
    
    if (!lightIcon || !darkIcon) {
      console.error('找不到主题图标');
      return;
    }
    
    console.log('主题切换按钮和图标已找到');
    
    // 初始更新图标状态
    updateThemeIcons();
    
    // 添加点击事件
    themeToggle.addEventListener('click', function() {
      console.log('点击了主题切换按钮');
      
      // 尝试找到并点击 Docsify 的原生主题切换按钮
      var darkmodeToggle = document.querySelector('.darkmode-toggle');
      if (darkmodeToggle) {
        darkmodeToggle.click();
        console.log('点击原生切换按钮成功');
      } else {
        // 如果找不到原生按钮，就手动切换
        console.log('找不到原生切换按钮，手动切换');
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
        console.log('已切换到暗色模式');
      } else {
        document.body.classList.add('light');
        document.body.classList.remove('dark');
        console.log('已切换到亮色模式');
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
      console.log('当前主题是暗色模式：', isDark);
      
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

// 文章目录自动滚动跟随功能
function initTOCScrollFollow() {
  console.log('开始初始化目录跟随功能');
  console.log('当前屏幕宽度:', window.innerWidth);
  console.log('当前屏幕高度:', window.innerHeight);
  
  // 查找目录元素
  var tocLinks = document.querySelectorAll('.toc-nav a, .page_toc a');
  var tocContainer = document.querySelector('.toc-nav > ul') || document.querySelector('.page_toc > ul');
  
  console.log('查找到的目录链接数量：', tocLinks.length);
  console.log('查找到的目录容器：', tocContainer);
  console.log('所有可能的目录元素：');
  console.log('- .toc-nav:', document.querySelectorAll('.toc-nav'));
  console.log('- .page_toc:', document.querySelectorAll('.page_toc'));
  console.log('- 所有目录相关元素:', document.querySelectorAll('[class*="toc"]'));
  
  // 检查是否在小屏幕上被隐藏
  if (window.innerWidth <= 360) {
    console.log('屏幕太小，目录被隐藏');
    return;
  }
  
  // 限制重试次数
  if (!window.tocInitRetries) {
    window.tocInitRetries = 0;
  }
  window.tocInitRetries++;
  
  if (!tocLinks.length && window.tocInitRetries < 20) {
    console.log('未找到目录链接，延迟重试...第', window.tocInitRetries, '次');
    setTimeout(initTOCScrollFollow, 500);
    return;
  }
  
  if (!tocContainer && window.tocInitRetries < 20) {
    console.log('未找到目录容器，延迟重试...第', window.tocInitRetries, '次');
    setTimeout(initTOCScrollFollow, 500);
    return;
  }
  
  if (window.tocInitRetries >= 20) {
    console.log('重试次数已达上限，停止初始化');
    return;
  }
  
  console.log('找到目录元素：', tocLinks.length, '个链接');
  
  // 获取所有标题元素
  function getAllHeadings() {
    var headings = [];
    var selectors = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']; // 包含h1
    
    console.log('开始扫描标题元素...');
    
    selectors.forEach(function(selector) {
      var elements = document.querySelectorAll('.markdown-section ' + selector);
      console.log('找到', selector, '标题', elements.length, '个');
      
      elements.forEach(function(el) {
        console.log('检查标题:', el.textContent.trim(), 'ID:', el.id);
        if (el.id) {
          var offsetTop = el.getBoundingClientRect().top + window.pageYOffset;
          headings.push({
            id: el.id,
            element: el,
            offsetTop: offsetTop
          });
          console.log('✓ 添加标题:', el.id, '位置:', offsetTop, '内容:', el.textContent.trim());
        } else {
          console.log('✗ 跳过无ID标题:', el.textContent.trim());
        }
      });
    });
    
    // 按位置排序
    headings.sort(function(a, b) {
      return a.offsetTop - b.offsetTop;
    });
    
    console.log('总共找到', headings.length, '个有ID的标题');
    return headings;
  }
  
  // 查找当前可见的标题
  function getCurrentHeading() {
    var headings = getAllHeadings();
    if (!headings.length) return null;
    
    var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    var offsetThreshold = 100; // 偏移阈值
    
    var currentHeading = null;
    
    // 从后往前找，找到第一个在当前滚动位置上方的标题
    for (var i = headings.length - 1; i >= 0; i--) {
      var heading = headings[i];
      var headingTop = heading.element.getBoundingClientRect().top + scrollTop;
      
      if (headingTop <= scrollTop + offsetThreshold) {
        currentHeading = heading;
        break;
      }
    }
    
    // 如果没找到，使用第一个标题
    return currentHeading || headings[0];
  }
  
  // 更新目录高亮和滚动位置
  function updateTOC() {
    var currentHeading = getCurrentHeading();
    if (!currentHeading) {
      return;
    }
    
    console.log('当前标题:', currentHeading.id);
    
    // 移除所有激活状态
    tocLinks.forEach(function(link) {
      link.classList.remove('active');
      if (link.parentElement) {
        link.parentElement.classList.remove('active');
      }
    });
    
    // 找到对应的目录链接
    var activeLink = null;
    console.log('寻找匹配的目录项，目标ID:', currentHeading.id);
    
    tocLinks.forEach(function(link, index) {
      var href = link.getAttribute('href');
      console.log('检查目录项', index, ':', href, '链接文本:', link.textContent.trim());
      
      if (href) {
        // 处理不同的href格式
        var linkId = href.replace(/^.*#/, ''); // 移除#前面的所有内容
        console.log('提取的ID:', linkId, '比较目标:', currentHeading.id);
        
        if (linkId === currentHeading.id) {
          link.classList.add('active');
          if (link.parentElement) {
            link.parentElement.classList.add('active');
          }
          activeLink = link;
          console.log('✓ 激活目录项:', linkId, '链接文本:', link.textContent.trim());
        }
      }
    });
    
    // 自动滚动目录，使当前项始终在中间
    if (activeLink && tocContainer) {
      try {
        // 更简单直接的计算方式
        var containerHeight = tocContainer.clientHeight || tocContainer.offsetHeight;
        var containerScrollHeight = tocContainer.scrollHeight;
        
        // 获取激活链接相对于容器的位置
        var linkOffsetTop = activeLink.offsetTop;
        var linkHeight = activeLink.offsetHeight || activeLink.clientHeight;
        
        // 计算目标滚动位置（将激活项放在容器中间）
        var targetScrollTop = linkOffsetTop - (containerHeight / 2) + (linkHeight / 2);
        
        // 确保滚动位置在合理范围内
        var maxScrollTop = Math.max(0, containerScrollHeight - containerHeight);
        targetScrollTop = Math.max(0, Math.min(targetScrollTop, maxScrollTop));
        
        // 获取当前滚动位置
        var currentScrollTop = tocContainer.scrollTop || 0;
        
        // 只有当差距超过阈值时才滚动，避免频繁滚动
        if (Math.abs(currentScrollTop - targetScrollTop) > 20) {
          // 直接设置scrollTop，确保兼容性
          tocContainer.scrollTop = targetScrollTop;
          
          console.log('滚动目录到中间位置:', targetScrollTop, '容器高度:', containerHeight, '当前激活:', activeLink.textContent.trim());
        }
      } catch (error) {
        console.error('目录滚动出错:', error);
        console.log('容器信息:', tocContainer);
        console.log('激活链接信息:', activeLink);
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
  
  // 监听滚动事件 - 使用更高的频率让跟随更流畅
  var throttledUpdate = throttle(updateTOC, 100);
  
  // 添加滚动事件监听器
  console.log('添加滚动事件监听器...');
  window.addEventListener('scroll', throttledUpdate, { passive: true });
  
  // 也监听主内容区域的滚动
  var mainContent = document.querySelector('.content') || document.body;
  if (mainContent) {
    console.log('也监听主内容区域滚动...');
    mainContent.addEventListener('scroll', throttledUpdate, { passive: true });
  }
  
  // 初始更新
  console.log('执行初始更新...');
  setTimeout(function() {
    console.log('延迟初始更新执行');
    updateTOC();
  }, 300);
  
  // 监听路由变化
  window.addEventListener('hashchange', function() {
    setTimeout(function() {
      // 重新获取目录元素
      tocLinks = document.querySelectorAll('.toc-nav a, .page_toc a');
      tocContainer = document.querySelector('.toc-nav > ul') || document.querySelector('.page_toc > ul');
      updateTOC();
    }, 500);
  });
  
  console.log('目录跟随功能初始化完成');
}

// 在多个时机尝试初始化
window.addEventListener('DOMContentLoaded', function() {
  setTimeout(initTOCScrollFollow, 800);
});

window.addEventListener('load', function() {
  setTimeout(initTOCScrollFollow, 1000);
});

// 监听Docsify的路由变化事件
if (typeof window.$docsify !== 'undefined') {
  window.$docsify.plugins = window.$docsify.plugins || [];
  window.$docsify.plugins.push(function(hook) {
    hook.doneEach(function() {
      setTimeout(initTOCScrollFollow, 500);
    });
  });
}
