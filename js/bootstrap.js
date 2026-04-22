function renderGameToText() {
  const slot = currentSlot();
  if (page === "play" && state.game) {
    const visibleDummies = getVisibleDummies(
      state.game.player,
      state.game.dummies || [],
      state.game.arena.width,
      state.game.arena.height,
    );
    const visibleMonsters = getVisibleMonsters(
      state.game.player,
      state.game.monsters || [],
      state.game.arena.width,
      state.game.arena.height,
      state.game.scene,
    );
    const visibleTorches = getVisibleTorches(
      state.game.scene,
      state.game.player,
      state.game.arena.width,
      state.game.arena.height,
    );
    return JSON.stringify({
      page,
      mode: state.game.runStarted ? "playing" : "staging",
      pausedByOverlay: typeof isPlaySimulationPaused === "function" ? isPlaySimulationPaused() : false,
      chapter: state.game.chapter,
      elapsed: Number((state.game.elapsed ?? 0).toFixed(2)),
      arena: {
        width: Math.round(state.game.arena.width),
        height: Math.round(state.game.arena.height),
        inset: Math.round(state.game.arena.inset),
      },
      player: {
        name: state.game.player.name,
        level: state.game.player.level,
        experience: experienceToString(state.game.player.experience),
        experienceToNextLevel: experienceToString(state.game.player.experienceToNextLevel),
        statPoints: Math.max(0, Math.floor(Number(state.game.player.statPoints ?? 0))),
        coreStats: state.game.player.coreStats ? { ...state.game.player.coreStats } : null,
        levelProgress: Number(experienceProgressRatio(
          state.game.player.experience,
          state.game.player.experienceToNextLevel,
        ).toFixed(4)),
        worldX: Math.round(state.game.player.worldX),
        worldY: Math.round(state.game.player.worldY),
        screenX: Math.round(state.game.player.screenX),
        screenY: Math.round(state.game.player.screenY),
        facing: Number(state.game.player.facing.toFixed(3)),
        speed: Math.round(currentMoveSpeed(state.game.player)),
        health: Math.round(state.game.player.health),
        maxHealth: state.game.player.maxHealth,
        mana: Math.round(state.game.player.mana),
        maxMana: state.game.player.maxMana,
        attack: state.game.player.attack,
        defense: state.game.player.defense,
        baseAgility: state.game.player.baseAgility,
        physicalBoostStacks: state.game.player.physicalBoostStacks ?? 0,
        agility: state.game.player.agility,
        maxArmor: state.game.player.maxArmor,
        armor: state.game.player.armor,
        attackSpeed: Number(state.game.player.attackSpeed.toFixed(2)),
        actionSpeed: Number((state.game.player.actionSpeed ?? state.game.player.attackSpeed).toFixed(2)),
        healthRegen: Number(state.game.player.healthRegen),
        manaRegen: Number(state.game.player.manaRegen),
        skillRange: Number(state.game.player.skillRange),
        equippedWeaponId: state.game.player.equippedWeaponId,
        attackCooldown: Number(state.game.player.attackCooldown.toFixed(2)),
        swing: state.game.player.swing
          ? {
              mode: state.game.player.swing.mode || "single",
              range: Number(state.game.player.swing.range.toFixed(2)),
              damage: state.game.player.swing.damage,
              timer: Number(state.game.player.swing.timer.toFixed(2)),
              targetCount: (state.game.player.swing.targetKeysInRange || []).length,
              hitTargetCount: (state.game.player.swing.hitTargetKeys || []).length,
            }
          : null,
        beam: state.game.player.beam
          ? {
              weaponId: state.game.player.beam.weaponId,
              range: Number(state.game.player.beam.range.toFixed(2)),
              damage: state.game.player.beam.damage,
              width: Number(state.game.player.beam.width.toFixed(2)),
              hitInterval: Number(state.game.player.beam.hitInterval.toFixed(2)),
              manaCostPerSecond: Number(state.game.player.beam.manaCostPerSecond.toFixed(2)),
            }
          : null,
        spin: state.game.player.spin
          ? {
              range: Number(state.game.player.spin.range.toFixed(2)),
              damage: state.game.player.spin.damage,
              spinManaProgress: Number((state.game.player.spinManaProgress ?? 0).toFixed(4)),
            }
          : null,
        distanceFromStartZone: Number(
          (typeof distanceFromRunStartZone === "function" ? distanceFromRunStartZone(state.game) : 0).toFixed(2)
        ),
      },
      startZone: state.game.startZone
        ? {
            active: !state.game.runStarted,
            originX: Math.round(state.game.startZone.originX),
            originY: Math.round(state.game.startZone.originY),
            radius: Math.round(state.game.startZone.radius),
          }
        : null,
      spawning: {
        runStarted: Boolean(state.game.runStarted),
        ratePerSecond: typeof currentMonsterSpawnRate === "function"
          ? currentMonsterSpawnRate(state.game)
          : 0,
        stage: Math.floor(Math.max(0, Number(state.game.elapsed ?? 0)) / 600),
        progress: Number(Number(state.game.monsterSpawnProgress ?? 0).toFixed(3)),
        loadedMonsters: Array.isArray(state.game.monsters) ? state.game.monsters.length : 0,
        loadedMonsterLimit: typeof MONSTER_MAX_ACTIVE_COUNT === "number" ? MONSTER_MAX_ACTIVE_COUNT : null,
      },
      mouse: {
        x: Math.round(state.input.mouseX),
        y: Math.round(state.input.mouseY),
      },
      torches: {
        visible: visibleTorches.length,
        sample: visibleTorches.slice(0, 3).map((torch) => ({
          x: Math.round(torch.worldX),
          y: Math.round(torch.worldY),
          radius: Math.round(torch.lightRadius),
        })),
      },
      dummies: visibleDummies.map((dummy) => ({
        id: dummy.id,
        x: Math.round(dummy.worldX),
        y: Math.round(dummy.worldY),
        screenX: Math.round(dummy.screenX),
        screenY: Math.round(dummy.screenY),
        hp: dummy.health,
      })),
      monsters: visibleMonsters.map((monster) => ({
        id: monster.id,
        monsterId: monster.monsterId,
        label: monster.label,
        stats: monster.stats ? { ...monster.stats } : null,
        x: Math.round(monster.worldX),
        y: Math.round(monster.worldY),
        screenX: Math.round(monster.screenX),
        screenY: Math.round(monster.screenY),
        hp: monster.health,
        maxHealth: monster.maxHealth,
        attack: monster.attack,
        defense: monster.defense,
        moveSpeed: monster.moveSpeed,
        awarenessRadius: monster.awarenessRadius,
        hitbox: monster.hitbox
          ? {
              x: Math.round(monster.hitbox.centerX),
              y: Math.round(monster.hitbox.centerY),
              width: Math.round(monster.hitbox.width),
              height: Math.round(monster.hitbox.height),
            }
          : null,
      })),
      effects: state.game.effects.map((effect) => ({
        kind: effect.kind,
        x: Math.round(effect.worldX),
        y: Math.round(effect.worldY),
        timer: Number(effect.timer.toFixed(2)),
      })),
      inventory: {
        open: state.hud.inventoryOpen,
        selectedIndex: state.game.inventory.selectedIndex,
        activeWeaponSlotIndex: state.game.inventory.activeWeaponSlotIndex,
        activeUtilitySlotIndex: state.game.inventory.activeUtilitySlotIndex,
        activeLoadoutTarget: resolveInventoryLoadoutTarget(state.game.inventory),
        activeContainerId: state.hud.activeContainerId,
        filledSlots: state.game.inventory.items.filter(Boolean).length,
        weaponSlots: state.game.inventory.weaponSlots,
        utilitySlots: state.game.inventory.utilitySlots,
        orbitingUtilityWeapons: getOrbitingUtilityWeapons().map((entry) => entry.weapon.label),
        containerFilledSlots: (getActiveContainer()?.items || []).filter(Boolean).length,
        equippedWeaponId: state.game.player.equippedWeaponId,
        starterWeaponClaimed: Boolean(state.game.starterWeaponClaimed),
      },
      containers: (state.game.containers || []).map((container) => ({
        id: container.id,
        x: Math.round(container.worldX),
        y: Math.round(container.worldY),
        looted: container.looted,
        filledSlots: container.items.filter(Boolean).length,
      })),
      hud: {
        settingsOpen: state.hud.settingsOpen,
        statsOpen: state.hud.statsOpen,
        inventoryOpen: state.hud.inventoryOpen,
        starterWeaponOpen: state.hud.starterWeaponOpen,
        rewardSelectionKind: state.hud.rewardSelectionKind || null,
        rewardSelectionRerollsLeft: Math.max(0, Math.floor(Number(state.hud.rewardSelectionRerollsLeft ?? 0))),
        starterWeaponOptions: (state.hud.starterWeaponOptions || [])
          .map((itemId) => getInventoryItemById(itemId))
          .filter(Boolean)
          .map((item) => item.label),
        pendingLevelRewardSelections: Math.max(0, Math.floor(Number(state.game.pendingLevelRewardSelections ?? 0))),
        inventoryHoverTitle: state.hud.inventoryHoverTitle || null,
        saveMessage: state.hud.saveMessage,
        volumes: state.settings,
      },
      controls: ["WASD move", "Leave the start circle to begin the run", "Mouse aim facing", "Left click cross slash", "Hold left click 2s to charge Twin Spin with Sword 17 while dual wielding (uses mana, +1 speed stack per 1 mana, stacks decay after 5s)", "Utility-slot melee weapons orbit idle, then auto-thrust in straight lines toward hostile lock targets", "E open or close inventory / nearest box", "Drag items between open box, stash, weapon hands, and utility slots", "Shift+click box item -> stash, Shift+click player item -> open box first", "Click portrait opens stats", "Hamburger opens settings/save", "Esc closes overlays or backs to menu", "F fullscreen"],
      combat: {
        dualMode: hasDualWield(),
        attackHeld: state.input.attackHeld,
        spinChargeTime: Number((state.input.attackHoldTime ?? 0).toFixed(2)),
        spinChargeDuration: SPIN_CHARGE_DURATION,
        spinChargeReady: (state.input.attackHoldTime ?? 0) >= SPIN_CHARGE_DURATION,
        spinManaCostPerSecond: SPIN_MANA_COST_PER_SECOND,
        spinSpeedGainPerMana: SPIN_SPEED_GAIN_PER_MANA,
        twinSpinPassiveSources: countWeaponPassiveSources(SPIN_PASSIVE_ID, ["hand", "utility"], state.game),
        utilityMeleeOrbitWeapons: getOrbitingUtilityWeapons(state.game).filter((entry) => Boolean(entry.weapon?.melee)).map((entry) => entry.weapon.label),
        utilityActiveThrusts: Object.values(state.game.player.utilityWeaponAttackStates || {})
          .filter((entry) => entry?.phase === "attack" || entry?.phase === "return")
          .length,
        stackedPhysicalBoost: state.game.player.physicalBoostStacks ?? 0,
        boostDecaySeconds: BOOST_STACK_DECAY_SECONDS,
        boostDecayRemaining: Number(
          Math.max(0, ((state.game.player.physicalBoostExpiresAt ?? 0) - performance.now()) / 1000).toFixed(2),
        ),
        dps: Number((state.game.combatMetrics?.dps ?? 0).toFixed(1)),
      },
      coordinateSystem: "canvas origin at top-left, +x right, +y down",
    });
  }

  return JSON.stringify({
    page,
    selectedSlot: {
      id: slot.id,
      occupied: slot.occupied,
      name: slot.name,
      title: slot.title,
      buildType: slot.buildType,
      origin: slot.origin,
      chapter: slot.chapter,
      risk: slot.risk,
      health: slot.health,
      skills: slot.skills,
      summary: slot.summary,
    },
    createDraft: {
      slotId: state.selectedSlotIndex + 1,
      name: state.createDraft.name,
      gender: state.createDraft.gender,
      origin: state.createDraft.origin,
    },
    prep: state.prep[String(slot.id)] || null,
    primaryAction: primaryActionLabel(slot),
    controls: controlsConfigForPage().items,
    coordinateSystem: "canvas origin at top-left, +x right, +y down",
  });
}

window.render_game_to_text = renderGameToText;
window.advanceTime = (ms) => {
  const steps = Math.max(1, Math.round(ms / (1000 / 60)));
  const slice = ms / steps;
  for (let i = 0; i < steps; i += 1) {
    step(slice);
  }
};

let resizeFrame = 0;
function scheduleResize() {
  if (resizeFrame) {
    window.cancelAnimationFrame(resizeFrame);
  }
  resizeFrame = window.requestAnimationFrame(() => {
    resizeFrame = 0;
    resizeCanvas();
    draw();
  });
}

document.addEventListener("keydown", handleKeyDown);
document.addEventListener("keyup", handleKeyUp);
canvas.addEventListener("mousemove", handlePointerMove);
canvas.addEventListener("mouseenter", handlePointerMove);
canvas.addEventListener("mousedown", handleCanvasMouseDown);
canvas.addEventListener("mouseup", handleCanvasMouseUp);
window.addEventListener("mouseup", handleCanvasMouseUp);
document.addEventListener("contextmenu", (event) => {
  if (page === "play") {
    event.preventDefault();
  }
});
window.addEventListener("resize", scheduleResize);
window.addEventListener("orientationchange", scheduleResize);
window.addEventListener("fullscreenchange", scheduleResize);
window.addEventListener("blur", () => {
  state.input.pressed.clear();
  state.input.attackHeld = false;
  state.input.attackHoldTime = 0;
  state.input.attackHoldStartedAt = 0;
  if (state.game?.player) {
    state.game.player.spin = null;
    resetPhysicalBoostStacks(state.game.player);
  }
});

const resizeObserver = new ResizeObserver(() => {
  scheduleResize();
});
resizeObserver.observe(canvas);
resizeObserver.observe(canvas.parentElement);

window.addEventListener("load", () => {
  resizeCanvas();
  draw();
});

initializePage();
resizeCanvas();
draw();
window.requestAnimationFrame(frame);
