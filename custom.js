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
