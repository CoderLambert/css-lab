Flexbox 的对齐不是固定的“水平”和“垂直”。更可靠的方式是先判断 **主轴** 与 **交叉轴**，再选择对应的属性和值。

## 主轴：justify-content

`justify-content` 控制项目如何沿主轴排列。默认 `flex-direction: row` 时，主轴从左到右。

- `center`：把项目作为一组放在主轴中央。
- `space-between`：让首尾项目贴近两端，其余空间平均分布在项目之间。

## 交叉轴：align-items

`align-items` 控制同一行项目在交叉轴上的整体对齐。

- `center`：沿交叉轴居中。
- `flex-end`：沿交叉轴末端对齐。

## 先判断轴，再选择值

当容器使用 `display: flex` 后，先问自己“我要改变的是哪条轴上的排列”，再选择 `justify-content` 或 `align-items`。这样即使以后修改 `flex-direction`，对齐逻辑仍然容易推导。
