// Animation states enum
const AnimationStates = {
    IDLE: 'idle',
    RUN: 'run',
    JUMP: 'jump',
    ATTACK: 'attack',
    BLOCK: 'block',
    INTRO: 'intro'
};

// Default animation configuration
const DefaultAnimationConfig = {
    frameCount: 4,
    frameDuration: 150,
    frameWidth: PLAYER_SIZE,
    frameHeight: PLAYER_SIZE,
    loop: true,
    autoPlay: false
};

// Helper function to create sprite configurations
function createSpriteConfig(characterName, animName, options = {}) {
    // First try to use real sprite, fall back to placeholder
    const src = createPlaceholderSprite(options.color || "#808080", 
                                      options.frameCount || DefaultAnimationConfig.frameCount, 
                                      PLAYER_SIZE, 
                                      PLAYER_SIZE);
    
    return {
        src: src,
        frameCount: options.frameCount || DefaultAnimationConfig.frameCount,
        frameDuration: options.frameDuration || DefaultAnimationConfig.frameDuration,
        frameWidth: options.frameWidth || DefaultAnimationConfig.frameWidth,
        frameHeight: options.frameHeight || DefaultAnimationConfig.frameHeight,
        loop: options.loop !== undefined ? options.loop : DefaultAnimationConfig.loop,
        autoPlay: options.autoPlay !== undefined ? options.autoPlay : (animName === AnimationStates.IDLE),
        onStart: options.onStart || null,
        onFrame: options.onFrame || null,
        onComplete: options.onComplete || null
    };
}