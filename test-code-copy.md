# 代码复制功能测试

这是一个用于测试点击代码块直接复制功能的页面。

## JavaScript 代码示例

```javascript
function hello() {
    console.log("点击这个代码块来复制我！");
    return "复制成功！";
}

const message = "这是一个测试代码块";
console.log(message);
```

## Python 代码示例

```python
def greet(name):
    """点击代码块直接复制"""
    return f"Hello, {name}!"

# 测试函数
print(greet("世界"))
```

## CSS 代码示例

```css
.test-style {
    /* 点击复制整个样式块 */
    background-color: #42b983;
    color: white;
    padding: 10px;
    border-radius: 5px;
}
```

## Bash 命令示例

```bash
# 点击复制整个命令块
echo "代码复制功能测试"
ls -la
pwd
```

## 功能说明

1. **点击代码块**: 直接点击代码内容区域即可复制
2. **视觉反馈**: 点击时会有闪烁动画效果  
3. **成功提示**: 显示"点击复制成功"消息
4. **双主题支持**: 在浅色和深色主题下都能正常工作
5. **移动端支持**: 支持触摸设备的点击复制
6. **传统按钮**: 保持原有复制按钮功能不变

## 测试步骤

1. 点击任意代码块
2. 观察视觉反馈动画
3. 查看复制成功提示
4. 粘贴到其他地方验证内容
5. 测试不同主题下的效果
6. 在移动设备上测试触摸体验