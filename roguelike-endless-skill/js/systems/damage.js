const DAMAGE_MINIMUM = 1;
const DAMAGE_DEFENSE_SCALE = 4;

const DAMAGE_MODE_MULTIPLIERS = {
  single: 1,
  "dual-cross": 0.92,
  spin: 0.34,
  beam: 0.62,
  "utility-orbit": 1,
  "utility-thrust": 1,
};

function combatTargetDefense(target) {
  const entity = target?.entity ?? target;
  return Math.max(0, Number(target?.defense ?? entity?.defense ?? 0));
}

function attackModeDamageMultiplier(mode = "single") {
  return DAMAGE_MODE_MULTIPLIERS[mode] ?? 1;
}

function defenseMitigationMultiplier(defense, scale = DAMAGE_DEFENSE_SCALE) {
  const safeDefense = Math.max(0, Number(defense) || 0);
  return 100 / (100 + safeDefense * scale);
}

function calculateResolvedDamage({
  baseDamage,
  target = null,
  attackMode = "single",
  outgoingMultiplier = 1,
  incomingMultiplier = 1,
  flatBonus = 0,
} = {}) {
  const rawDamage = Math.max(0, Number(baseDamage) + Number(flatBonus || 0));
  const modeMultiplier = attackModeDamageMultiplier(attackMode);
  const defense = combatTargetDefense(target);
  const mitigationMultiplier = defenseMitigationMultiplier(defense);
  const finalDamage = Math.max(
    DAMAGE_MINIMUM,
    Math.round(rawDamage * modeMultiplier * Number(outgoingMultiplier || 1) * mitigationMultiplier * Number(incomingMultiplier || 1)),
  );

  return {
    rawDamage,
    attackMode,
    modeMultiplier,
    defense,
    mitigationMultiplier,
    finalDamage,
  };
}
