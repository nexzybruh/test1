const bgAnimation = document.getElementById('bgAnimation');

const numberOfColorBoxes = 400;

for (let i = 0; i < numberOfColorBoxes; i++) {
    const colorBox = document.createElement('div');
    colorBox.classList.add('colorBox');
    bgAnimation.append(colorBox)
}
document.getElementById('planosBtn').addEventListener('click', function() {
    document.getElementById('planos').style.display = 'block';
});

document.getElementById('closeBtn').addEventListener('click', function() {
    document.getElementById('planos').style.display = 'none';
});
