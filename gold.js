CharacterSystem.register('gold', {
    ...BaseCharacter,
    name: "Gold",
    color: "#42a5f5",
    abilities: {
        keyHold: function(key, duration) {
            const controls = getControls(this.id);
            if (key === controls.special && duration > 1000) {
                if (!this.chargingLogged[key]) {
                    log("Gold is charging power!");
                    this.chargingLogged[key] = true;
                }
            }
        },
        keyRelease: function(key, duration) {
            const controls = getControls(this.id);
            if (key === controls.special && duration > 1000) {
                AbilityLibrary.superJump(this, 1.5);
                log("Gold released a super jump!");
            }
        }
    }
});