/* ==========================================================================
   NYCS - INTERACTIVE CANVAS ENGINE & PARALLAX
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  setupLoader();
  setupInteractiveCanvas();
});

// --------------------------------------------------------------------------
// 1. TELA DE CARREGAMENTO (LOADER)
// --------------------------------------------------------------------------
function setupLoader() {
  const loader = document.getElementById('loader');
  if (!loader) return;
  
  const fadeOut = () => {
    setTimeout(() => {
      loader.classList.add('fade-out');
    }, 1000);
  };

  // Garante que o loader suma mesmo se a página já estiver carregada
  if (document.readyState === 'complete') {
    fadeOut();
  } else {
    window.addEventListener('load', fadeOut);
  }
}

// --------------------------------------------------------------------------
// 2. CANVAS INTERATIVO: PARTÍCULAS E LINHAS NEON
// --------------------------------------------------------------------------
function setupInteractiveCanvas() {
  const canvas = document.getElementById('canvas-bg');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  const techFrame = document.getElementById('tech-frame');
  
  // Estado Global de Interação
  const state = {
    width: 0,
    height: 0,
    centerX: 0,
    centerY: 0,
    mouse: { x: 0, y: 0, targetX: 0, targetY: 0 },
    isMobile: false,
    particles: [],
    neonLines: [],
    autoDriftAngle: 0
  };

  // Redimensionamento Inteligente
  function resize() {
    state.width = canvas.width = window.innerWidth;
    state.height = canvas.height = window.innerHeight;
    state.centerX = state.width / 2;
    state.centerY = state.height / 2;
    state.isMobile = state.width < 768;
    
    initElements();
  }

  window.addEventListener('resize', resize);

  // Interpolação Linear (LERP) para suavizar movimentos
  function lerp(start, end, amt) {
    return (1 - amt) * start + amt * end;
  }

  // Classe de Partícula 3D Simulada
  class Particle {
    constructor() {
      this.reset(true);
    }

    reset(init = false) {
      this.x = Math.random() * state.width;
      this.y = Math.random() * state.height;
      this.z = init ? Math.random() * 2 + 0.5 : 2.5; // Profundidade (Z)
      this.size = (1.5 / this.z) * (state.isMobile ? 1 : 1.5);
      this.speedX = (Math.random() - 0.5) * (0.35 / this.z);
      this.speedY = (Math.random() - 0.5) * (0.35 / this.z);
      this.alpha = (1 - this.z / 3) * 0.7; // Mais longe = mais opaco/fundo
      
      // Coordenadas projetadas
      this.drawX = this.x;
      this.drawY = this.y;
    }

    update() {
      // Movimento natural
      this.x += this.speedX;
      this.y += this.speedY;

      // Reposiciona se sair da tela
      if (this.x < 0 || this.x > state.width || this.y < 0 || this.y > state.height) {
        this.reset();
      }
    }

    draw() {
      // Offset de paralaxe na renderização baseado na profundidade Z (sem acumular na física)
      this.drawX = this.x + (state.mouse.x * 35 / this.z);
      this.drawY = this.y + (state.mouse.y * 35 / this.z);

      ctx.beginPath();
      ctx.arc(this.drawX, this.drawY, this.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha})`;
      ctx.fill();
    }
  }

  // Linhas Neon Onduladas Bézier
  class NeonLine {
    constructor(color, offset) {
      this.color = color;
      this.offset = offset;
      this.speed = 0.002 + Math.random() * 0.002;
      this.phase = Math.random() * Math.PI;
    }

    update() {
      this.phase += this.speed;
    }

    draw() {
      ctx.beginPath();
      
      // Gradiente linear para evitar cortes secos nas bordas da tela
      const grad = ctx.createLinearGradient(0, 0, state.width, 0);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      grad.addColorStop(0.15, this.color);
      grad.addColorStop(0.5, this.color);
      grad.addColorStop(0.85, this.color);
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.strokeStyle = grad;
      ctx.lineWidth = state.isMobile ? 1.5 : 3.5;
      ctx.shadowBlur = state.isMobile ? 10 : 30;
      ctx.shadowColor = this.color;

      const steps = state.isMobile ? 30 : 60;
      const stepSize = state.width / steps;
      
      for (let i = 0; i <= steps; i++) {
        const x = i * stepSize;
        const wave = Math.sin(i * 0.06 + this.phase) * (state.isMobile ? 30 : 65);
        // Influência interativa do mouse na altura da onda
        const y = state.centerY + wave + this.offset + (state.mouse.y * (state.isMobile ? 25 : 60));

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      ctx.shadowBlur = 0; // Reseta para não afetar outros elementos
    }
  }

  function initElements() {
    state.particles = [];
    const count = state.isMobile ? 35 : 90;
    for (let i = 0; i < count; i++) {
      state.particles.push(new Particle());
    }

    state.neonLines = [
      new NeonLine('#00f3ff', -100), // Linha Ciano
      new NeonLine('#ff007f', 100)   // Linha Magenta
    ];
  }

  // Rastreamento de Mouse Normalizado (-1 a 1)
  window.addEventListener('mousemove', (e) => {
    state.mouse.targetX = (e.clientX - state.centerX) / state.centerX;
    state.mouse.targetY = (e.clientY - state.centerY) / state.centerY;
  });

  // Suporte a Telas Touch
  window.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
      state.mouse.targetX = (e.touches[0].clientX - state.centerX) / state.centerX;
      state.mouse.targetY = (e.touches[0].clientY - state.centerY) / state.centerY;
    }
  }, { passive: true });

  // Drift Automático quando inativo ou em celular
  let lastMoveTime = Date.now();
  window.addEventListener('mousemove', () => { lastMoveTime = Date.now(); });
  window.addEventListener('touchmove', () => { lastMoveTime = Date.now(); });

  // Loop de Animação
  function animate() {
    ctx.clearRect(0, 0, state.width, state.height);

    // Se o mouse estiver inativo, entra em rotação orbital suave automática
    if (Date.now() - lastMoveTime > 2500) {
      state.autoDriftAngle += 0.004;
      state.mouse.targetX = Math.cos(state.autoDriftAngle) * 0.35;
      state.mouse.targetY = Math.sin(state.autoDriftAngle) * 0.25;
    }

    // Suavização das posições do mouse com LERP
    state.mouse.x = lerp(state.mouse.x, state.mouse.targetX, 0.06);
    state.mouse.y = lerp(state.mouse.y, state.mouse.targetY, 0.06);

    // Parallax 3D no painel/moldura tecnológica
    if (techFrame) {
      const rotateX = -state.mouse.y * 12; // pitch
      const rotateY = state.mouse.x * 12;  // yaw
      const translateX = state.mouse.x * 15;
      const translateY = state.mouse.y * 15;
      
      techFrame.style.transform = `translate3d(${translateX}px, ${translateY}px, 0) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    }

    // Renderiza Linhas Neon
    state.neonLines.forEach(line => {
      line.update();
      line.draw();
    });

    // Renderiza Partículas
    state.particles.forEach(p => {
      p.update();
      p.draw();
    });

    // Conexões de constelação de partículas (com fade de opacidade por distância)
    for (let i = 0; i < state.particles.length; i++) {
      const p1 = state.particles[i];
      for (let j = i + 1; j < state.particles.length; j++) {
        const p2 = state.particles[j];
        const dx = p1.drawX - p2.drawX;
        const dy = p1.drawY - p2.drawY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 95) {
          const alpha = (1 - dist / 95) * 0.12;
          ctx.strokeStyle = `rgba(0, 243, 255, ${alpha})`;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(p1.drawX, p1.drawY);
          ctx.lineTo(p2.drawX, p2.drawY);
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(animate);
  }

  // Inicialização
  resize();
  animate();
}
