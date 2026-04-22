function initializeMainPage() {
  syncSettingsControls();

  mainStartButton?.addEventListener("click", () => {
    goToPage("select");
  });

  mainArchivesButton?.addEventListener("click", () => {
    if (mainMenuStatus) {
      mainMenuStatus.textContent = "Multiplayer is not available yet.";
    }
  });

  mainSettingsButton?.addEventListener("click", () => {
    if (!mainSettingsPanel) return;
    const nextHidden = !mainSettingsPanel.hidden;
    mainSettingsPanel.hidden = nextHidden;
    if (mainMenuStatus) {
      mainMenuStatus.textContent = nextHidden
        ? "Feature coming soon."
        : "Settings open.";
    }
  });

  mainExitButton?.addEventListener("click", () => {
    if (mainMenuStatus) {
      mainMenuStatus.textContent = "Close the tab when you are ready to leave.";
    }
  });

  mainSettingsPanel?.addEventListener("click", (event) => {
    if (event.target !== mainSettingsPanel) return;
    mainSettingsPanel.hidden = true;
    if (mainMenuStatus) {
      mainMenuStatus.textContent = "Feature coming soon.";
    }
  });

  [
    [masterVolumeInput, "masterVolume", masterVolumeValue],
    [effectsVolumeInput, "effectsVolume", effectsVolumeValue],
    [musicVolumeInput, "musicVolume", musicVolumeValue],
  ].forEach(([input, key, label]) => {
    input?.addEventListener("input", (event) => {
      state.settings[key] = clamp(Number(event.target.value), 0, 100);
      label.textContent = `${state.settings[key]}%`;
      saveSettings();
    });
  });

  graphicsQualitySelect?.addEventListener("change", (event) => {
    state.settings.graphicsQuality = normalizeGraphicsQuality(event.target.value);
    if (graphicsQualityValue) {
      graphicsQualityValue.textContent = graphicsQualityLabel(state.settings.graphicsQuality);
    }
    saveSettings();
  });
}

function initializeMenuPage() {
  renderMenu();
  renderSelection();

  startButton?.addEventListener("click", () => {
    const slot = currentSlot();
    if (slot.occupied) {
      goToPage("play");
    } else {
      goToPage("create");
    }
  });

  cycleButton?.addEventListener("click", () => cycleSlot(1));

  deleteButton?.addEventListener("click", () => {
    const slot = currentSlot();
    if (!slot.occupied) return;
    toggleDeleteModal(true);
  });

  deleteCancelButton?.addEventListener("click", () => {
    toggleDeleteModal(false);
  });

  deleteConfirmButton?.addEventListener("click", () => {
    deleteCurrentSlot();
  });

  deleteModal?.addEventListener("click", (event) => {
    if (event.target !== deleteModal) return;
    toggleDeleteModal(false);
  });
}

function initializeCreatePage() {
  const slot = currentSlot();
  if (slot.occupied) {
    goToPage("select");
    return;
  }

  state.createDraft.name = "";
  state.createDraft.gender = "female";
  state.createDraft.origin = "lost-wanderer";
  if (nameInput) {
    nameInput.value = "";
  }
  renderCreateDraft();
  nameInput?.focus();

  nameInput?.addEventListener("input", (event) => {
    state.createDraft.name = event.target.value.slice(0, 18);
    renderCreateDraft();
  });

  genderButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.createDraft.gender = button.dataset.gender;
      renderCreateDraft();
    });
  });

  originButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.createDraft.origin = button.dataset.origin;
      renderCreateDraft();
    });
  });

  createConfirmButton?.addEventListener("click", () => {
    createCharacter();
    goToPage("ritual");
  });

  createBackButton?.addEventListener("click", () => {
    goToPage("select");
  });
}

function initializeRitualPage() {
  const slot = currentSlot();
  if (!slot.occupied) {
    goToPage("create");
    return;
  }

  const prep = ensurePrepForSlot(slot);
  state.ritualUi.activeSlotIndex = 0;
  state.ritualUi.focusedSkillId = prep.ritualSkillIds[0] || "";
  state.ritualUi.searchTerm = "";
  state.ritualUi.categoryFilter = "all";
  renderRitualPage();

  ritualSkillGrid?.addEventListener("click", (event) => {
    const skillButton = event.target.closest("[data-skill-id]");
    if (!skillButton) return;
    const skillId = skillButton.dataset.skillId;
    setFocusedRitualSkill(skillId);
    renderRitualPage();
  });

  ritualSlotBar?.addEventListener("click", (event) => {
    const slotButton = event.target.closest("[data-slot-index]");
    if (!slotButton) return;
    state.ritualUi.activeSlotIndex = Number(slotButton.dataset.slotIndex) || 0;
    renderRitualPage();
  });

  ritualSearchInput?.addEventListener("input", (event) => {
    state.ritualUi.searchTerm = event.target.value;
    renderRitualPage();
  });

  ritualSlotIndicatorBar?.addEventListener("click", (event) => {
    const slotButton = event.target.closest("[data-slot-index]");
    if (!slotButton) return;
    state.ritualUi.activeSlotIndex = Number(slotButton.dataset.slotIndex) || 0;
    const prep = ensurePrepForSlot(slot);
    state.ritualUi.focusedSkillId = prep.ritualSkillIds[state.ritualUi.activeSlotIndex] || state.ritualUi.focusedSkillId;
    renderRitualPage();
  });

  ritualEquipButton?.addEventListener("click", () => {
    if (!state.ritualUi.focusedSkillId) return;
    assignRitualSkillToSlot(state.ritualUi.focusedSkillId);
    renderRitualPage();
  });

  ritualBackButton?.addEventListener("click", () => {
    goToPage("create");
  });

  ritualRerollButton?.addEventListener("click", () => {
    rerollRitualSkills();
    state.ritualUi.focusedSkillId = ensurePrepForSlot(slot).ritualSkillIds[0] || "";
    renderRitualPage();
  });

  ritualAcceptButton?.addEventListener("click", () => {
    const prep = ensurePrepForSlot(slot);
    prep.ritualAccepted = true;
    prep.buildSealed = true;
    slot.skills = prepSkills(prep).map((skill) => skill.name);
    slot.buildType = buildTypeFromPrep(prep);
    slot.summary = "Fragments bound.";
    savePrep();
    saveSlots();
    goToPage("play");
  });
}

function initializeSetupPage() {
  const slot = currentSlot();
  goToPage(slot.occupied ? "ritual" : "create");
}

function initializeStartRunPage() {
  const slot = currentSlot();
  goToPage(slot.occupied ? "ritual" : "create");
}

function initializePlayPage() {
  const slot = currentSlot();
  if (!slot.occupied) {
    goToPage("create");
    return;
  }

  startPlayingSession();
  syncSettingsControls();

  portraitButton?.addEventListener("click", () => {
    toggleHudStats();
  });
  hudRewardBadge?.addEventListener("click", () => {
    openQueuedLevelRewardSelectionFromHud();
  });
  hudStatsPanel?.addEventListener("click", handleHudStatInteraction);

  inventoryGrid?.addEventListener("mousedown", handleInventoryPointerDown);
  containerGrid?.addEventListener("mousedown", handleInventoryPointerDown);
  weaponSlotGrid?.addEventListener("mousedown", handleInventoryPointerDown);
  utilitySlotGrid?.addEventListener("mousedown", handleInventoryPointerDown);
  inventoryGrid?.addEventListener("click", handleInventoryInteraction);
  containerGrid?.addEventListener("click", handleInventoryInteraction);
  weaponSlotGrid?.addEventListener("click", handleWeaponSlotInteraction);
  utilitySlotGrid?.addEventListener("click", handleUtilitySlotInteraction);
  hudInventoryPanel?.addEventListener("mousemove", handleInventoryHoverMove);
  hudInventoryPanel?.addEventListener("mouseleave", clearInventoryHoverCard);
  [hudInventoryPanel, inventoryGrid, weaponSlotGrid, utilitySlotGrid, containerGrid].forEach((node) => {
    node?.addEventListener("dragstart", handleInventoryDragStart);
    node?.addEventListener("dragover", handleInventoryDragOver);
    node?.addEventListener("drop", handleInventoryDrop);
    node?.addEventListener("dragend", handleInventoryDragEnd);
  });

  hudMenuToggle?.addEventListener("click", () => {
    toggleHudSettings();
  });

  starterWeaponGrid?.addEventListener("click", handleStarterWeaponSelection);
  starterWeaponReroll?.addEventListener("click", handleStarterWeaponReroll);

  hudBackdrop?.addEventListener("click", () => {
    toggleHudSettings(false);
    toggleHudStats(false);
    toggleHudInventory(false);
  });

  [
    [masterVolumeInput, "masterVolume", masterVolumeValue],
    [effectsVolumeInput, "effectsVolume", effectsVolumeValue],
    [musicVolumeInput, "musicVolume", musicVolumeValue],
  ].forEach(([input, key, label]) => {
    input?.addEventListener("input", (event) => {
      state.settings[key] = clamp(Number(event.target.value), 0, 100);
      label.textContent = `${state.settings[key]}%`;
      saveSettings();
    });
  });

  graphicsQualitySelect?.addEventListener("change", (event) => {
    state.settings.graphicsQuality = normalizeGraphicsQuality(event.target.value);
    if (graphicsQualityValue) {
      graphicsQualityValue.textContent = graphicsQualityLabel(state.settings.graphicsQuality);
    }
    saveSettings();
  });

  hudSaveButton?.addEventListener("click", () => {
    saveCurrentProgress();
  });
}

function initializePage() {
  loadPersistedState();
  state.selectedSlotIndex = readSlotIndexFromUrl();
  syncSlotUrl();
  renderControls();

  if (page === "main") {
    initializeMainPage();
  } else if (page === "menu") {
    initializeMenuPage();
  } else if (page === "create") {
    initializeCreatePage();
  } else if (page === "ritual") {
    initializeRitualPage();
  } else if (page === "setup") {
    initializeSetupPage();
  } else if (page === "start-run") {
    initializeStartRunPage();
  } else if (page === "briefing") {
    const slot = currentSlot();
    goToPage(slot.occupied ? "ritual" : "select");
  } else if (page === "play") {
    initializePlayPage();
  }
}
