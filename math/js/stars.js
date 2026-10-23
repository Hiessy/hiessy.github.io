// --- BACKGROUND STAR FIELD ---
(function () {
    const canvas = document.getElementById('star-canvas');
    const ctx = canvas.getContext('2d');
    const stars = [];

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    class Star {
        constructor() {
            this.reset();
        }
        reset() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.z = Math.random() * 2 + 0.5; // Speed/Size
            this.alpha = Math.random();
        }
        update() {
            this.y += this.z * 0.5;
            if (this.y > canvas.height) this.reset();
            this.alpha = Math.abs(Math.sin(Date.now() * 0.001 * this.z));
        }
        draw() {
            ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.z, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    for (let i = 0; i < 100; i++) stars.push(new Star());

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        stars.forEach(s => { s.update(); s.draw(); });
        requestAnimationFrame(animate);
    }
    animate();
})();
