CharacterSystem.register('berry', {
    ...BaseCharacter,
    name: "Berry",
    color: "#ef5350",
    abilities: {
        keyHold: function(key, duration) {
            const controls = getControls(this.id);
            if (key === controls.special && duration > 1000) {
                if (!this.chargingLogged[key]) {
                    AbilityLibrary.superJump(this, 2.0, 1);
                    log("Berry is charging a jump!");
                }
            }
        }
    }
});