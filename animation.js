// Animation system for sprite-based character animations
const AnimationSystem = {
  // Cache for loaded images to avoid reloading
  imageCache: {},
  
  // Load an image and cache it
  loadImage: function(src) {
    if (!this.imageCache[src]) {
      const img = new Image();
      img.src = src;
      this.imageCache[src] = img;
    }
    return this.imageCache[src];
  },
  
  // Create a new animation
  createAnimation: function(config) {
    return {
      name: config.name || 'unnamed',
      spriteSheet: this.loadImage(config.src),
      frameCount: config.frameCount || 1,
      frameDuration: config.frameDuration || 100, // ms per frame
      frameWidth: config.frameWidth,
      frameHeight: config.frameHeight,
      loop: config.loop !== undefined ? config.loop : true,
      autoPlay: config.autoPlay !== undefined ? config.autoPlay : true,
      startFrame: config.startFrame || 0,
      row: config.row || 0, // For sprite sheets with multiple rows
      currentFrame: 0,
      lastFrameTime: 0,
      isPlaying: false,
      isFinished: false,
      flipX: config.flipX || false,
      onComplete: config.onComplete || null
    };
  },
  
  // Create an animation controller for a character
  createAnimationController: function() {
    return {
      animations: {},
      currentAnimation: null,
      
      // Add an animation to this controller
      add: function(animation) {
        this.animations[animation.name] = animation;
        // If this is the first animation, set it as current
        if (!this.currentAnimation) {
          this.currentAnimation = animation.name;
          if (animation.autoPlay) {
            animation.isPlaying = true;
            animation.lastFrameTime = performance.now();
          }
        }
        return this;
      },
      
      // Play a specific animation
      play: function(name, reset = true) {
        if (this.animations[name]) {
          // Don't restart if already playing this animation unless reset=true
          if (this.currentAnimation === name && !reset) {
            return;
          }
          
          const prevAnim = this.currentAnimation;
          this.currentAnimation = name;
          
          const anim = this.animations[name];
          if (reset) {
            anim.currentFrame = anim.startFrame;
            anim.isFinished = false;
          }
          anim.isPlaying = true;
          anim.lastFrameTime = performance.now();
          
          return prevAnim;
        }
        return null;
      },
      
      // Stop the current animation
      stop: function() {
        if (this.currentAnimation) {
          this.animations[this.currentAnimation].isPlaying = false;
        }
      },
      
      // Update the animation state
      update: function() {
        if (!this.currentAnimation) return;
        
        const anim = this.animations[this.currentAnimation];
        if (!anim.isPlaying || anim.isFinished) return;
        
        const now = performance.now();
        const elapsed = now - anim.lastFrameTime;
        
        if (elapsed >= anim.frameDuration) {
          // Calculate how many frames to advance (for variable framerates)
          const framesToAdvance = Math.floor(elapsed / anim.frameDuration);
          anim.currentFrame += framesToAdvance;
          anim.lastFrameTime = now - (elapsed % anim.frameDuration);
          
          // Handle loop or completion
          if (anim.currentFrame >= anim.frameCount) {
            if (anim.loop) {
              anim.currentFrame %= anim.frameCount;
            } else {
              anim.currentFrame = anim.frameCount - 1;
              anim.isPlaying = false;
              anim.isFinished = true;
              if (anim.onComplete) anim.onComplete();
            }
          }
        }
      },
      
      // Draw the current animation frame
      draw: function(ctx, x, y, facing) {
        if (!this.currentAnimation) return;
        
        const anim = this.animations[this.currentAnimation];
        const spriteSheet = anim.spriteSheet;
        
        // Don't try to draw if the image isn't loaded yet
        if (!spriteSheet.complete) return;
        
        const frameX = (anim.currentFrame % anim.frameCount) * anim.frameWidth;
        const frameY = anim.row * anim.frameHeight;
        
        ctx.save();
        
        // Handle facing direction and flip if needed
        if ((facing === -1 && !anim.flipX) || (facing === 1 && anim.flipX)) {
          ctx.translate(x + anim.frameWidth, y);
          ctx.scale(-1, 1);
          ctx.drawImage(
            spriteSheet,
            frameX, frameY, anim.frameWidth, anim.frameHeight,
            0, 0, anim.frameWidth, anim.frameHeight
          );
        } else {
          ctx.drawImage(
            spriteSheet, 
            frameX, frameY, anim.frameWidth, anim.frameHeight,
            x, y, anim.frameWidth, anim.frameHeight
          );
        }
        
        ctx.restore();
      },
      
      // Check if current animation is finished
      isFinished: function() {
        if (!this.currentAnimation) return true;
        return this.animations[this.currentAnimation].isFinished;
      },
      
      // Get current animation name
      getCurrent: function() {
        return this.currentAnimation;
      }
    };
  }
};