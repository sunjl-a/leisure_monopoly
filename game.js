const START_CASH = 1500;
const PASS_GO_CASH = 200;
const BAIL_COST = 100;
const MAX_HOUSES = 4;
const AI_DELAY = 520;

const PLAYER_COLORS = ["#e74c3c", "#2f80ed", "#27ae60", "#9b51e0"];
const PLAYER_ICONS = ["🐼", "🦊", "🐯", "🐵"];
const GROUP_COLORS = {
  brown: "#8b5a2b",
  cyan: "#56ccf2",
  pink: "#eb5757",
  orange: "#f2994a",
  red: "#d7263d",
  yellow: "#f2c94c",
  green: "#219653",
  blue: "#2f80ed",
  transit: "#64748b",
};

const elements = {
  setupScreen: document.querySelector("#setup-screen"),
  gameScreen: document.querySelector("#game-screen"),
  endScreen: document.querySelector("#end-screen"),
  playerCount: document.querySelector("#player-count"),
  playerConfigs: document.querySelector("#player-configs"),
  setupError: document.querySelector("#setup-error"),
  startGame: document.querySelector("#start-game"),
  restartGame: document.querySelector("#restart-game"),
  playAgain: document.querySelector("#play-again"),
  board: document.querySelector("#board"),
  diceDisplay: document.querySelector("#dice-display"),
  turnTitle: document.querySelector("#turn-title"),
  turnMessage: document.querySelector("#turn-message"),
  actionButtons: document.querySelector("#action-buttons"),
  playersList: document.querySelector("#players-list"),
  gameLog: document.querySelector("#game-log"),
  manageAssets: document.querySelector("#manage-assets"),
  dialog: document.querySelector("#tile-dialog"),
  dialogTitle: document.querySelector("#dialog-title"),
  dialogBody: document.querySelector("#dialog-body"),
  closeDialog: document.querySelector("#close-dialog"),
  winnerTitle: document.querySelector("#winner-title"),
  finalRanking: document.querySelector("#final-ranking"),
};

let state = null;
let audioContext = null;

const SOUND_PATTERNS = {
  start: [
    { type: "triangle", frequency: 392, start: 0, duration: 0.1, gain: 0.09 },
    { type: "triangle", frequency: 523, start: 0.11, duration: 0.12, gain: 0.08 },
    { type: "triangle", frequency: 659, start: 0.24, duration: 0.16, gain: 0.07 },
  ],
  dice: [
    { type: "square", frequency: 260, start: 0, duration: 0.045, gain: 0.06 },
    { type: "square", frequency: 390, start: 0.055, duration: 0.045, gain: 0.055 },
    { type: "square", frequency: 310, start: 0.11, duration: 0.05, gain: 0.05 },
  ],
  money: [
    { type: "sine", frequency: 740, start: 0, duration: 0.07, gain: 0.06 },
    { type: "sine", frequency: 988, start: 0.08, duration: 0.1, gain: 0.05 },
  ],
  card: [
    { type: "triangle", frequency: 620, start: 0, duration: 0.08, gain: 0.055 },
    { type: "triangle", frequency: 460, start: 0.08, duration: 0.11, gain: 0.045 },
  ],
  auction: [
    { type: "square", frequency: 520, start: 0, duration: 0.06, gain: 0.055 },
    { type: "square", frequency: 520, start: 0.1, duration: 0.06, gain: 0.05 },
  ],
  jail: [
    { type: "sawtooth", frequency: 220, start: 0, duration: 0.12, gain: 0.055 },
    { type: "sawtooth", frequency: 165, start: 0.13, duration: 0.18, gain: 0.045 },
  ],
  win: [
    { type: "triangle", frequency: 523, start: 0, duration: 0.12, gain: 0.08 },
    { type: "triangle", frequency: 659, start: 0.13, duration: 0.12, gain: 0.075 },
    { type: "triangle", frequency: 784, start: 0.26, duration: 0.2, gain: 0.07 },
  ],
};

function getAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioContext) audioContext = new AudioContextClass();
  if (audioContext.state === "suspended") audioContext.resume();
  return audioContext;
}

function playSound(name) {
  const context = getAudioContext();
  const pattern = SOUND_PATTERNS[name];
  if (!context || !pattern) return;
  const now = context.currentTime;
  pattern.forEach((note) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = now + note.start;
    const end = start + note.duration;
    oscillator.type = note.type;
    oscillator.frequency.setValueAtTime(note.frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(note.gain, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(end + 0.02);
  });
}

function createBoard() {
  return [
    { type: "start", name: "起点", icon: "🚩" },
    property("南京", "brown", 60, [2, 10, 30, 90, 160], 50),
    { type: "fate", name: "命运", icon: "🧧" },
    property("苏州", "brown", 60, [4, 20, 60, 180, 320], 50),
    { type: "tax", name: "城市建设费", icon: "🏗️", amount: 200 },
    transit("京沪高铁"),
    property("杭州", "cyan", 100, [6, 30, 90, 270, 400], 50),
    { type: "chance", name: "机会", icon: "🎲" },
    property("宁波", "cyan", 100, [6, 30, 90, 270, 400], 50),
    property("厦门", "cyan", 120, [8, 40, 100, 300, 450], 50),
    { type: "jail", name: "探监 / 监狱", icon: "🚓" },
    property("成都", "pink", 140, [10, 50, 150, 450, 625], 100),
    { type: "utility", name: "水电公司", icon: "💡", price: 150, owner: null, mortgaged: false },
    property("重庆", "pink", 140, [10, 50, 150, 450, 625], 100),
    property("西安", "pink", 160, [12, 60, 180, 500, 700], 100),
    transit("珠江机场"),
    property("武汉", "orange", 180, [14, 70, 200, 550, 750], 100),
    { type: "fate", name: "命运", icon: "🧧" },
    property("长沙", "orange", 180, [14, 70, 200, 550, 750], 100),
    property("郑州", "orange", 200, [16, 80, 220, 600, 800], 100),
    { type: "parking", name: "免费停车", icon: "🅿️" },
    property("青岛", "red", 220, [18, 90, 250, 700, 875], 150),
    { type: "chance", name: "机会", icon: "🎲" },
    property("济南", "red", 220, [18, 90, 250, 700, 875], 150),
    property("天津", "red", 240, [20, 100, 300, 750, 925], 150),
    transit("西部铁路"),
    property("深圳", "yellow", 260, [22, 110, 330, 800, 975], 150),
    property("广州", "yellow", 260, [22, 110, 330, 800, 975], 150),
    { type: "utility", name: "通信公司", icon: "📡", price: 150, owner: null, mortgaged: false },
    property("香港", "yellow", 280, [24, 120, 360, 850, 1025], 150),
    { type: "gotojail", name: "入狱", icon: "🚔" },
    property("大连", "green", 300, [26, 130, 390, 900, 1100], 200),
    property("沈阳", "green", 300, [26, 130, 390, 900, 1100], 200),
    { type: "fate", name: "命运", icon: "🧧" },
    property("哈尔滨", "green", 320, [28, 150, 450, 1000, 1200], 200),
    transit("北方港口"),
    { type: "chance", name: "机会", icon: "🎲" },
    property("上海", "blue", 350, [35, 175, 500, 1100, 1300], 200),
    { type: "tax", name: "豪华消费税", icon: "💎", amount: 100 },
    property("北京", "blue", 400, [50, 200, 600, 1400, 1700], 200),
  ];
}

function property(name, group, price, rent, houseCost) {
  return { type: "property", name, group, price, rent, houseCost, owner: null, houses: 0, mortgaged: false };
}

function transit(name) {
  return { type: "transit", name, icon: "🚄", price: 200, owner: null, mortgaged: false };
}

function createCards() {
  return {
    chance: shuffle([
      { text: "夜市生意火爆，获得 ¥150。", effect: (p) => changeCash(p, 150) },
      { text: "参加城市路演，前进到上海。", effect: (p) => moveTo(p, 37) },
      { text: "暴雨延误，支付维修费 ¥80。", effect: (p) => chargePlayer(p, 80, null, "维修费") },
      { text: "直达起点，领取奖金。", effect: (p) => moveTo(p, 0, true) },
      { text: "收到文旅补贴 ¥100。", effect: (p) => changeCash(p, 100) },
      { text: "交通违章，进入监狱。", effect: (p) => sendToJail(p) },
      { text: "城市更新基金，每栋房屋支付 ¥25。", effect: (p) => chargePlayer(p, countHouses(p) * 25, null, "城市更新基金") },
      { text: "机场快线优惠，前进 3 格。", effect: (p) => moveSteps(p, 3) },
    ]),
    fate: shuffle([
      { text: "银行分红，获得 ¥200。", effect: (p) => changeCash(p, 200) },
      { text: "医疗支出，支付 ¥100。", effect: (p) => chargePlayer(p, 100, null, "医疗支出") },
      { text: "前进到最近交通枢纽。", effect: (p) => moveToNearest(p, ["transit"]) },
      { text: "社区活动获奖，获得 ¥50。", effect: (p) => changeCash(p, 50) },
      { text: "回到南京。", effect: (p) => moveTo(p, 1) },
      { text: "获得保释卡。", effect: (p) => { p.getOutCards += 1; addLog(`${p.name} 获得一张保释卡。`); } },
      { text: "给每位未破产玩家发红包 ¥30。", effect: (p) => payEveryPlayer(p, 30) },
      { text: "公共服务奖励，从每位未破产玩家收取 ¥25。", effect: (p) => collectFromEveryPlayer(p, 25) },
    ]),
  };
}

function initSetup() {
  elements.playerCount.addEventListener("change", renderPlayerConfigs);
  elements.startGame.addEventListener("click", startGame);
  elements.restartGame.addEventListener("click", resetToSetup);
  elements.playAgain.addEventListener("click", resetToSetup);
  elements.manageAssets.addEventListener("click", showAssetManager);
  elements.closeDialog.addEventListener("click", () => elements.dialog.close());
  renderPlayerConfigs();
}

function renderPlayerConfigs() {
  const count = Number(elements.playerCount.value);
  elements.playerConfigs.innerHTML = "";
  for (let i = 0; i < count; i += 1) {
    const row = document.createElement("div");
    row.className = "player-config";
    row.innerHTML = `
      <div class="avatar-dot" style="background:${PLAYER_COLORS[i]}">${PLAYER_ICONS[i]}</div>
      <input id="player-name-${i}" value="玩家${i + 1}" maxlength="8" aria-label="玩家${i + 1}名称" />
      <select id="player-type-${i}" aria-label="玩家${i + 1}类型">
        <option value="human"${i === 0 ? " selected" : ""}>真人玩家</option>
        <option value="ai"${i !== 0 ? " selected" : ""}>电脑玩家</option>
      </select>
    `;
    elements.playerConfigs.appendChild(row);
  }
}

function startGame() {
  const count = Number(elements.playerCount.value);
  const players = [];
  for (let i = 0; i < count; i += 1) {
    const name = document.querySelector(`#player-name-${i}`).value.trim() || `玩家${i + 1}`;
    const type = document.querySelector(`#player-type-${i}`).value;
    players.push({
      id: i,
      name,
      type,
      color: PLAYER_COLORS[i],
      icon: PLAYER_ICONS[i],
      cash: START_CASH,
      position: 0,
      properties: [],
      jailTurns: 0,
      getOutCards: 0,
      bankrupt: false,
      lastRoll: 0,
      builtHouseThisTurn: false,
    });
  }
  if (!players.some((player) => player.type === "human")) {
    elements.setupError.textContent = "至少需要 1 名真人玩家。";
    return;
  }
  elements.setupError.textContent = "";
  state = {
    players,
    board: createBoard(),
    decks: createCards(),
    deckIndex: { chance: 0, fate: 0 },
    currentPlayer: 0,
    phase: "roll",
    dice: [0, 0],
    logs: [],
    pendingDebt: null,
    auction: null,
  };
  showScreen("game");
  addLog("游戏开始。每位玩家获得 ¥1500。");
  playSound("start");
  render();
  beginTurn();
}

function showScreen(screen) {
  elements.setupScreen.classList.toggle("hidden", screen !== "setup");
  elements.gameScreen.classList.toggle("hidden", screen !== "game");
  elements.endScreen.classList.toggle("hidden", screen !== "end");
}

function currentPlayer() {
  return state.players[state.currentPlayer];
}

function beginTurn() {
  if (checkWinner()) return;
  const player = currentPlayer();
  if (player.bankrupt) {
    nextTurn();
    return;
  }
  state.phase = "roll";
  state.pendingDebt = null;
  player.builtHouseThisTurn = false;
  addLog(`轮到 ${player.name}。`);
  render();
  if (player.type === "ai") {
    setTimeout(() => runAiTurn(player), AI_DELAY);
  }
}

function runAiTurn(player) {
  if (!state || state.phase === "ended" || player.id !== currentPlayer().id || player.bankrupt) return;
  if (player.jailTurns > 0) {
    if ((player.cash > 350 || player.getOutCards > 0) && leaveJail(player)) {
      setTimeout(() => aiRoll(player), AI_DELAY);
    } else {
      player.jailTurns -= 1;
      addLog(`${player.name} 在监狱停留一回合。`);
      if (player.jailTurns === 0) addLog(`${player.name} 下回合可以离开监狱。`);
      render();
      setTimeout(nextTurn, AI_DELAY);
    }
    return;
  }
  aiRoll(player);
}

function aiRoll(player) {
  rollDice();
  setTimeout(() => {
    if (state.phase !== "action" || player.bankrupt) return;
    const tile = state.board[player.position];
    if (canBuy(player, tile) && shouldAiBuy(player, tile)) {
      buyTile(player, tile);
    } else if (isPurchasable(tile)) {
      startAuction(tile);
      return;
    }
    aiBuildAndMortgage(player);
    if (state.phase !== "ended" && !state.pendingDebt) {
      setTimeout(nextTurn, AI_DELAY);
    }
  }, AI_DELAY);
}

function rollDice() {
  const player = currentPlayer();
  if (!player || state.phase !== "roll" || player.jailTurns > 0) return;
  const d1 = randomDie();
  const d2 = randomDie();
  state.dice = [d1, d2];
  player.lastRoll = d1 + d2;
  addLog(`${player.name} 掷出 ${d1} + ${d2} = ${player.lastRoll}。`);
  playSound("dice");
  moveSteps(player, player.lastRoll);
}

function moveSteps(player, steps) {
  const oldPosition = player.position;
  const newPosition = (oldPosition + steps) % state.board.length;
  if (oldPosition + steps >= state.board.length) {
    changeCash(player, PASS_GO_CASH, false);
    addLog(`${player.name} 经过起点，获得 ¥${PASS_GO_CASH}。`);
    playSound("money");
  }
  player.position = newPosition;
  resolveTile(player, state.board[player.position]);
}

function moveTo(player, index, alwaysPayGo = false) {
  if (alwaysPayGo || index < player.position) {
    changeCash(player, PASS_GO_CASH, false);
    addLog(`${player.name} 经过起点，获得 ¥${PASS_GO_CASH}。`);
    playSound("money");
  }
  player.position = index;
  resolveTile(player, state.board[player.position]);
}

function moveToNearest(player, types) {
  for (let step = 1; step <= state.board.length; step += 1) {
    const target = (player.position + step) % state.board.length;
    if (types.includes(state.board[target].type)) {
      moveSteps(player, step);
      return;
    }
  }
}

function resolveTile(player, tile) {
  if (player.bankrupt) return;
  state.phase = "action";
  addLog(`${player.name} 到达 ${tile.name}。`);
  if (tile.type === "start" || tile.type === "jail" || tile.type === "parking") {
    render();
    return;
  }
  if (tile.type === "gotojail") {
    sendToJail(player);
    render();
    return;
  }
  if (tile.type === "tax") {
    chargePlayer(player, tile.amount, null, tile.name);
    render();
    return;
  }
  if (tile.type === "chance" || tile.type === "fate") {
    drawCard(player, tile.type);
    render();
    return;
  }
  if (isPurchasable(tile)) {
    render();
    return;
  }
  if (tile.owner != null && tile.owner !== player.id && !tile.mortgaged) {
    const owner = state.players[tile.owner];
    const rent = calculateRent(tile, player);
    chargePlayer(player, rent, owner, `${tile.name} 租金`);
  } else if (tile.owner != null && tile.mortgaged) {
    addLog(`${tile.name} 已抵押，本次不收租。`);
  }
  render();
}

function canBuy(player, tile) {
  return isPurchasable(tile) && player.cash >= tile.price;
}

function isPurchasable(tile) {
  return ["property", "transit", "utility"].includes(tile.type) && tile.owner === null;
}

function buyTile(player, tile) {
  if (!canBuy(player, tile)) return;
  player.cash -= tile.price;
  tile.owner = player.id;
  player.properties.push(state.board.indexOf(tile));
  addLog(`${player.name} 购买 ${tile.name}，支付 ¥${tile.price}。`);
  playSound("money");
  render();
}

function startAuction(tile) {
  const bidders = state.players.filter((p) => !p.bankrupt && p.cash >= 10).map((p) => p.id);
  if (bidders.length === 0) {
    addLog(`${tile.name} 流拍。`);
    state.phase = "action";
    render();
    return;
  }
  state.phase = "auction";
  state.auction = { tileIndex: state.board.indexOf(tile), bidders, highestBid: 0, winner: null, cursor: 0, roundPasses: 0 };
  addLog(`${tile.name} 开始拍卖。`);
  playSound("auction");
  render();
  continueAuction();
}

function continueAuction() {
  const auction = state.auction;
  if (!auction || auction.bidders.length <= 1) {
    finishAuction();
    return;
  }
  const player = state.players[auction.bidders[auction.cursor % auction.bidders.length]];
  if (player.type === "ai") {
    setTimeout(() => aiAuctionBid(player), AI_DELAY);
  } else {
    render();
  }
}

function humanAuctionBid(amount) {
  const auction = state.auction;
  const player = currentAuctionPlayer();
  if (!auction || !player || player.type !== "human") return;
  placeBid(player, amount);
}

function humanAuctionPass() {
  const auction = state.auction;
  const player = currentAuctionPlayer();
  if (!auction || !player || player.type !== "human") return;
  auction.bidders = auction.bidders.filter((id) => id !== player.id);
  addLog(`${player.name} 退出拍卖。`);
  if (auction.bidders.length <= 1) {
    finishAuction();
  } else {
    auction.cursor %= auction.bidders.length;
    continueAuction();
  }
}

function aiAuctionBid(player) {
  const auction = state.auction;
  if (!auction || player.id !== currentAuctionPlayer().id) return;
  const tile = state.board[auction.tileIndex];
  const max = Math.min(player.cash - 50, Math.floor(tile.price * (shouldAiBuy(player, tile) ? 1.05 : 0.65)));
  const nextBid = Math.max(10, auction.highestBid + 20);
  if (nextBid <= max) {
    placeBid(player, nextBid);
  } else {
    auction.bidders = auction.bidders.filter((id) => id !== player.id);
    addLog(`${player.name} 退出拍卖。`);
    if (auction.bidders.length <= 1) finishAuction();
    else {
      auction.cursor %= auction.bidders.length;
      continueAuction();
    }
  }
}

function placeBid(player, amount) {
  const auction = state.auction;
  if (!auction || amount <= auction.highestBid || amount > player.cash) return;
  auction.highestBid = amount;
  auction.winner = player.id;
  addLog(`${player.name} 出价 ¥${amount}。`);
  auction.cursor = (auction.cursor + 1) % auction.bidders.length;
  render();
  continueAuction();
}

function finishAuction() {
  const auction = state.auction;
  if (!auction) return;
  const tile = state.board[auction.tileIndex];
  const fallbackWinner = auction.bidders.length === 1 ? auction.bidders[0] : null;
  const winnerId = auction.winner ?? fallbackWinner;
  if (winnerId !== null && auction.highestBid > 0) {
    const winner = state.players[winnerId];
    winner.cash -= auction.highestBid;
    tile.owner = winner.id;
    winner.properties.push(auction.tileIndex);
    addLog(`${winner.name} 以 ¥${auction.highestBid} 拍得 ${tile.name}。`);
    playSound("money");
  } else {
    addLog(`${tile.name} 流拍。`);
  }
  state.auction = null;
  state.phase = "action";
  render();
  if (currentPlayer().type === "ai") setTimeout(nextTurn, AI_DELAY);
}

function currentAuctionPlayer() {
  const auction = state.auction;
  if (!auction || auction.bidders.length === 0) return null;
  return state.players[auction.bidders[auction.cursor % auction.bidders.length]];
}

function calculateRent(tile, visitor) {
  if (tile.type === "transit") {
    const owner = state.players[tile.owner];
    const count = owner.properties.map((i) => state.board[i]).filter((t) => t.type === "transit" && !t.mortgaged).length;
    return 25 * Math.pow(2, Math.max(0, count - 1));
  }
  if (tile.type === "utility") {
    const owner = state.players[tile.owner];
    const count = owner.properties.map((i) => state.board[i]).filter((t) => t.type === "utility" && !t.mortgaged).length;
    return visitor.lastRoll * (count === 2 ? 10 : 4);
  }
  const baseRent = tile.rent[tile.houses];
  return hasMonopoly(state.players[tile.owner], tile.group) && tile.houses === 0 ? baseRent * 2 : baseRent;
}

function drawCard(player, deckName) {
  const deck = state.decks[deckName];
  const index = state.deckIndex[deckName] % deck.length;
  state.deckIndex[deckName] += 1;
  const card = deck[index];
  addLog(`${player.name} 抽到：${card.text}`);
  playSound("card");
  card.effect(player);
}

function chargePlayer(player, amount, receiver = null, reason = "费用") {
  if (amount <= 0) return;
  player.cash -= amount;
  addLog(`${player.name} 支付 ${reason} ¥${amount}${receiver ? ` 给 ${receiver.name}` : ""}。`);
  playSound("money");
  if (player.cash < 0) {
    state.pendingDebt = { playerId: player.id, receiverId: receiver ? receiver.id : null, amount: Math.abs(player.cash), reason };
    if (handleDebt(player) && receiver) receiver.cash += amount;
  } else if (receiver) {
    receiver.cash += amount;
  }
}

function changeCash(player, amount, log = true) {
  player.cash += amount;
  if (log) addLog(`${player.name} ${amount >= 0 ? "获得" : "支付"} ¥${Math.abs(amount)}。`);
  if (log) playSound("money");
}

function handleDebt(player) {
  if (player.cash >= 0) {
    state.pendingDebt = null;
    return true;
  }
  autoResolveDebt(player);
  if (player.cash >= 0) {
    state.pendingDebt = null;
    addLog(`${player.name} 通过资产处理还清欠款。`);
    return true;
  }
  declareBankruptcy(player, state.pendingDebt ? state.pendingDebt.receiverId : null);
  return false;
}

function autoResolveDebt(player) {
  const mortgageCandidates = [...player.properties]
    .map((index) => state.board[index])
    .filter((tile) => !tile.mortgaged && tile.houses === 0)
    .sort((a, b) => (a.group === b.group ? 0 : hasMonopoly(player, a.group) ? 1 : -1));
  for (const tile of mortgageCandidates) {
    if (player.cash >= 0) break;
    mortgageTile(player, tile, true);
  }
}

function declareBankruptcy(player, receiverId = null) {
  player.bankrupt = true;
  addLog(`${player.name} 破产出局。`);
  for (const index of player.properties) {
    const tile = state.board[index];
    tile.houses = 0;
    tile.mortgaged = false;
    if (receiverId !== null && !state.players[receiverId].bankrupt) {
      tile.owner = receiverId;
      state.players[receiverId].properties.push(index);
    } else {
      tile.owner = null;
    }
  }
  player.properties = [];
  player.cash = 0;
  state.pendingDebt = null;
  render();
  checkWinner();
}

function sendToJail(player) {
  player.position = 10;
  player.jailTurns = 2;
  state.phase = "action";
  addLog(`${player.name} 被送入监狱。`);
  playSound("jail");
}

function leaveJail(player) {
  if (player.getOutCards > 0) {
    player.getOutCards -= 1;
    player.jailTurns = 0;
    addLog(`${player.name} 使用保释卡离开监狱。`);
    render();
    return true;
  }
  if (player.cash >= BAIL_COST) {
    player.cash -= BAIL_COST;
    player.jailTurns = 0;
    addLog(`${player.name} 支付 ¥${BAIL_COST} 保释离开监狱。`);
    playSound("money");
    render();
    return true;
  }
  return false;
}

function skipJailTurn() {
  const player = currentPlayer();
  if (!player || player.jailTurns <= 0) return;
  player.jailTurns -= 1;
  addLog(`${player.name} 在监狱停留一回合。`);
  if (player.jailTurns === 0) addLog(`${player.name} 下回合可以离开监狱。`);
  render();
  nextTurn();
}

function buildHouse(player, tile) {
  if (!canBuildHouse(player, tile)) return;
  player.cash -= tile.houseCost;
  tile.houses += 1;
  player.builtHouseThisTurn = true;
  addLog(`${player.name} 在 ${tile.name} 建造房屋，支付 ¥${tile.houseCost}。`);
  render();
}

function canBuildHouse(player, tile) {
  return !buildHouseBlockReason(player, tile);
}

function buildHouseBlockReason(player, tile) {
  if (tile.type !== "property") return "只有城市地块可以建房。";
  if (tile.owner !== player.id) return "只能在自己的城市建房。";
  if (tile.mortgaged) return "已抵押的城市不能建房。";
  if (tile.houses >= MAX_HOUSES) return "该城市房屋已达上限。";
  if (player.builtHouseThisTurn) return "本回合已经建过房屋。";
  if (!canBuildEvenly(player, tile)) return "需先给同组房屋更少的城市建房。";
  if (player.cash < tile.houseCost) return `现金不足，需要 ¥${tile.houseCost}。`;
  return "";
}

function canBuildEvenly(player, tile) {
  const groupTiles = player.properties
    .map((index) => state.board[index])
    .filter((groupTile) => groupTile.type === "property" && groupTile.group === tile.group && !groupTile.mortgaged);
  const fewestHouses = Math.min(...groupTiles.map((groupTile) => groupTile.houses));
  return tile.houses === fewestHouses;
}

function mortgageTile(player, tile, silent = false) {
  if (!canMortgage(player, tile)) return false;
  tile.mortgaged = true;
  const value = Math.floor(tile.price / 2);
  player.cash += value;
  addLog(`${player.name} 抵押 ${tile.name}，获得 ¥${value}。`);
  if (!silent) render();
  return true;
}

function redeemTile(player, tile) {
  if (!canRedeem(player, tile)) return;
  const cost = Math.ceil(tile.price * 0.55);
  player.cash -= cost;
  tile.mortgaged = false;
  addLog(`${player.name} 赎回 ${tile.name}，支付 ¥${cost}。`);
  render();
}

function canMortgage(player, tile) {
  return tile.owner === player.id && !tile.mortgaged && tile.houses === 0;
}

function canRedeem(player, tile) {
  const cost = Math.ceil(tile.price * 0.55);
  return tile.owner === player.id && tile.mortgaged && player.cash >= cost;
}

function aiBuildAndMortgage(player) {
  let built = true;
  while (built) {
    built = false;
    const options = player.properties
      .map((index) => state.board[index])
      .filter((tile) => canBuildHouse(player, tile) && player.cash - tile.houseCost >= 350)
      .sort((a, b) => b.rent[b.houses + 1] - a.rent[a.houses + 1]);
    if (options.length > 0) {
      buildHouse(player, options[0]);
      built = true;
    }
  }
}

function hasMonopoly(player, group) {
  if (!group) return false;
  return propertyGroupTiles(group).every((tile) => tile.owner === player.id && !tile.mortgaged);
}

function propertyGroupTiles(group) {
  return state.board.filter((tile) => tile.type === "property" && tile.group === group);
}

function shouldAiBuy(player, tile) {
  if (player.cash - tile.price < 220) return false;
  if (tile.type === "property") {
    const groupTiles = state.board.filter((t) => t.type === "property" && t.group === tile.group);
    const ownedInGroup = groupTiles.filter((t) => t.owner === player.id).length;
    return ownedInGroup > 0 || tile.price <= 260 || player.cash > tile.price + 500;
  }
  return player.cash > tile.price + 300;
}

function payEveryPlayer(player, amount) {
  for (const other of state.players) {
    if (other.id !== player.id && !other.bankrupt) {
      chargePlayer(player, amount, other, "红包");
      if (player.bankrupt) break;
    }
  }
}

function collectFromEveryPlayer(player, amount) {
  for (const other of state.players) {
    if (other.id !== player.id && !other.bankrupt) {
      chargePlayer(other, amount, player, "公共服务奖励");
    }
  }
}

function countHouses(player) {
  return player.properties.reduce((total, index) => total + (state.board[index].houses || 0), 0);
}

function nextTurn() {
  if (!state || state.phase === "ended" || checkWinner()) return;
  state.currentPlayer = nextActiveIndex(state.currentPlayer);
  beginTurn();
}

function nextActiveIndex(index) {
  let next = index;
  do {
    next = (next + 1) % state.players.length;
  } while (state.players[next].bankrupt);
  return next;
}

function checkWinner() {
  const active = state.players.filter((player) => !player.bankrupt);
  if (active.length === 1) {
    state.phase = "ended";
    renderEnd(active[0]);
    return true;
  }
  return false;
}

function render() {
  if (!state) return;
  renderBoard();
  renderPlayers();
  renderActions();
  renderLog();
  elements.diceDisplay.textContent = state.dice[0] ? `🎲 ${state.dice[0]} + ${state.dice[1]}` : "🎲 -";
}

function renderBoard() {
  elements.board.innerHTML = `
    <div class="board-center">
      <div class="center-content">
        <strong>🏙️ 城市大富翁</strong>
        <span>买下城市、建设街区、收取租金。抵押可以救急，但会暂停收租。</span>
        <section class="log-panel center-log">
          <h3>游戏日志</h3>
          <ol id="game-log" class="game-log"></ol>
        </section>
      </div>
    </div>
  `;
  state.board.forEach((tile, index) => {
    const tileEl = document.createElement("button");
    tileEl.type = "button";
    tileEl.className = getTileClassName(tile, index);
    const bandColor = tile.group ? GROUP_COLORS[tile.group] : GROUP_COLORS[tile.type] || "#d9c8ad";
    tileEl.style.gridColumn = boardPosition(index).col;
    tileEl.style.gridRow = boardPosition(index).row;
    if (tile.owner != null) tileEl.style.setProperty("--owner-color", state.players[tile.owner].color);
    tileEl.innerHTML = `
      <div class="tile-band" style="background:${bandColor}"></div>
      <div class="tile-body">
        <span class="tile-icon">${tile.icon || tileIcon(tile)}</span>
        <span class="tile-name">${tile.name}</span>
      </div>
      <div class="tile-meta">${renderTileMeta(tile)}</div>
      <div class="tokens">${renderTokens(index)}</div>
    `;
    tileEl.addEventListener("click", () => showTileDialog(index));
    elements.board.appendChild(tileEl);
  });
}

function getTileClassName(tile, index) {
  const classes = ["tile"];
  if (index === 0) classes.push("start-tile");
  if (tile.price && tile.owner == null) classes.push("unowned-tile");
  if (tile.owner != null) classes.push("owned-tile");
  if (tile.mortgaged) classes.push("mortgaged");
  if (state.players.some((player) => !player.bankrupt && player.position === index)) classes.push("occupied-tile");
  return classes.join(" ");
}

function boardPosition(index) {
  if (index <= 10) return { col: 11 - index, row: 11 };
  if (index <= 20) return { col: 1, row: 21 - index };
  if (index <= 30) return { col: index - 19, row: 1 };
  return { col: 11, row: index - 29 };
}

function renderTileMeta(tile) {
  if (tile.type === "start") return `<span class="start-label">起点 +¥${PASS_GO_CASH}</span>`;
  if (tile.owner != null) {
    const owner = state.players[tile.owner];
    const houses = tile.houses ? `<span class="house-row">${Array.from({ length: tile.houses }, () => `<span class="house"></span>`).join("")}</span>` : "";
    const status = tile.mortgaged ? `<span class="status-label">抵押</span>` : houses;
    return `<span class="owner-label" style="--owner-color:${owner.color}">${owner.name}</span>${status}`;
  }
  if (tile.price) return `<span class="sale-label"><span>待售</span><strong>¥${tile.price}</strong></span>`;
  return "";
}

function renderTokens(index) {
  return state.players
    .filter((player) => !player.bankrupt && player.position === index)
    .map((player) => `
      <span class="token ${player.type === "ai" ? "token-ai" : "token-human"}" style="--token-color:${player.color}" title="${player.name}（${player.type === "ai" ? "电脑玩家" : "真人玩家"}）">
        <span class="token-icon">${player.icon}</span>
        <span class="token-type">${player.type === "ai" ? "电脑" : "真人"}</span>
      </span>
    `)
    .join("");
}

function tileIcon(tile) {
  if (tile.type === "property") return "🏠";
  if (tile.type === "utility") return tile.icon;
  return "📍";
}

function renderPlayers() {
  elements.playersList.innerHTML = state.players.map((player) => {
    const propertyChips = player.properties.map((index) => {
      const tile = state.board[index];
      const color = tile.group ? GROUP_COLORS[tile.group] : GROUP_COLORS[tile.type] || "#999";
      return `
        <span class="property-chip ${tile.mortgaged ? "chip-mortgaged" : ""}" title="${tile.name}" style="--chip-color:${color}">
          <span class="chip-dot"></span>${tile.name}${tile.mortgaged ? "（抵押）" : ""}
        </span>
      `;
    }).join("");
    return `
      <article class="player-card ${player.id === state.currentPlayer ? "active" : ""} ${player.bankrupt ? "bankrupt" : ""}">
        <div class="player-head">
          <span class="token ${player.type === "ai" ? "token-ai" : "token-human"} panel-token" style="--token-color:${player.color}">
            <span class="token-icon">${player.icon}</span>
            <span class="token-type">${player.type === "ai" ? "电脑" : "真人"}</span>
          </span>
          <strong>${player.name}</strong>
          <span class="badge">${player.type === "human" ? "真人玩家" : "电脑玩家"}</span>
        </div>
        <div class="stats">
          <span><strong>¥${player.cash}</strong>现金</span>
          <span><strong>${player.properties.length}</strong>资产</span>
          <span><strong>${player.jailTurns > 0 ? player.jailTurns : "-"}</strong>监狱</span>
        </div>
        <div class="property-chips">${propertyChips || ""}</div>
      </article>
    `;
  }).join("");
}

function renderActions() {
  const player = currentPlayer();
  if (!player || state.phase === "ended") return;
  elements.turnTitle.textContent = `${player.icon} ${player.name}`;
  elements.turnMessage.textContent = turnMessage(player);
  elements.actionButtons.innerHTML = "";
  if (state.phase === "auction") {
    const bidder = currentAuctionPlayer();
    const auction = state.auction;
    if (bidder) {
      elements.turnTitle.textContent = `${bidder.icon} ${bidder.name}`;
    }
    if (bidder && bidder.type === "human") {
      const bid = Math.min(bidder.cash, auction.highestBid + 20);
      addButton(`出价 ¥${bid}`, () => humanAuctionBid(bid), bid > bidder.cash);
      addButton("退出拍卖", humanAuctionPass);
    } else {
      addButton("等待拍卖", null, true, "wide");
    }
    return;
  }
  if (player.type === "ai") {
    addButton("电脑玩家自动行动中", null, true, "wide");
    return;
  }
  if (player.jailTurns > 0 && state.phase === "roll") {
    addButton(player.getOutCards > 0 ? "使用保释卡" : `支付保释 ¥${BAIL_COST}`, () => { leaveJail(player); render(); }, !player.getOutCards && player.cash < BAIL_COST);
    addButton("停留一回合", skipJailTurn);
    return;
  }
  if (state.phase === "roll") {
    addButton("掷骰", rollDice, false, "wide");
    return;
  }
  const tile = state.board[player.position];
  if (isPurchasable(tile)) {
    addButton(`购买 ¥${tile.price}`, () => buyTile(player, tile), !canBuy(player, tile));
    addButton("发起拍卖", () => startAuction(tile));
  }
  addButton("资产管理", showAssetManager);
  addButton("结束回合", nextTurn);
}

function turnMessage(player) {
  if (state.phase === "auction" && state.auction) {
    const tile = state.board[state.auction.tileIndex];
    const bidder = currentAuctionPlayer();
    return `${tile.name} 正在拍卖，当前最高价 ¥${state.auction.highestBid || 0}${bidder ? `，等待 ${bidder.name}` : ""}。`;
  }
  if (player.jailTurns > 0 && state.phase === "roll") return `你在监狱中，还需等待 ${player.jailTurns} 回合，也可以保释离开。`;
  const tile = state.board[player.position];
  if (state.phase === "roll") return "准备掷骰移动。";
  if (isPurchasable(tile)) return `${tile.name} 尚无主人，可以购买或发起拍卖。`;
  return `当前位置：${tile.name}。可以管理资产或结束回合。`;
}

function addButton(label, handler, disabled = false, className = "") {
  const button = document.createElement("button");
  button.textContent = label;
  button.disabled = disabled;
  button.className = className;
  if (handler) button.addEventListener("click", handler);
  elements.actionButtons.appendChild(button);
}

function renderLog() {
  elements.gameLog = document.querySelector("#game-log");
  if (!elements.gameLog) return;
  elements.gameLog.innerHTML = state.logs.slice(0, 80).map((entry) => `<li>${entry}</li>`).join("");
}

function showTileDialog(index) {
  const tile = state.board[index];
  elements.dialogTitle.textContent = tile.name;
  const owner = tile.owner != null ? state.players[tile.owner].name : "无";
  const rent = tile.type === "property" ? tile.rent.map((value, i) => `${i} 房：¥${value}`).join(" / ") : "";
  elements.dialogBody.innerHTML = `
    <p><strong>类型：</strong>${tileTypeName(tile.type)}</p>
    ${tile.price ? `<p><strong>价格：</strong>¥${tile.price}</p>` : ""}
    ${tile.group ? `<p><strong>城市组：</strong><span style="color:${GROUP_COLORS[tile.group]};font-weight:900"> ${tile.group}</span></p>` : ""}
    <p><strong>拥有者：</strong>${owner}</p>
    ${tile.houseCost ? `<p><strong>建房成本：</strong>¥${tile.houseCost}</p>` : ""}
    ${rent ? `<p><strong>租金：</strong>${rent}</p>` : ""}
    ${tile.mortgaged ? "<p><strong>状态：</strong>已抵押，不收租。</p>" : ""}
  `;
  elements.dialog.showModal();
}

function showAssetManager() {
  const player = currentPlayer();
  if (!player || player.type !== "human") return;
  elements.dialogTitle.textContent = `${player.name} 的资产`;
  const rows = player.properties.map((index) => {
    const tile = state.board[index];
    const buildDisabled = !canBuildHouse(player, tile);
    const buildReason = buildDisabled ? buildHouseBlockReason(player, tile) : "建造 1 栋房屋";
    const mortgageDisabled = !canMortgage(player, tile);
    const redeemDisabled = !canRedeem(player, tile);
    return `
      <div class="asset-row">
        <div>
          <strong>${tile.name}</strong><br />
          <span>${tile.mortgaged ? "已抵押" : `${tile.houses || 0} 栋房屋`}</span>
          ${buildDisabled && tile.type === "property" ? `<span class="asset-reason">${buildReason}</span>` : ""}
        </div>
        ${tile.type === "property" ? `<button class="small-btn" data-action="build" data-index="${index}" title="${buildReason}" ${buildDisabled ? "disabled" : ""}>建房</button>` : "<span></span>"}
        <button class="small-btn" data-action="${tile.mortgaged ? "redeem" : "mortgage"}" data-index="${index}" ${(tile.mortgaged ? redeemDisabled : mortgageDisabled) ? "disabled" : ""}>${tile.mortgaged ? "赎回" : "抵押"}</button>
      </div>
    `;
  }).join("");
  elements.dialogBody.innerHTML = rows || "<p>暂无资产。</p>";
  elements.dialogBody.querySelectorAll("button[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const tile = state.board[Number(button.dataset.index)];
      if (button.dataset.action === "build") buildHouse(player, tile);
      if (button.dataset.action === "mortgage") mortgageTile(player, tile);
      if (button.dataset.action === "redeem") redeemTile(player, tile);
      showAssetManager();
    });
  });
  elements.dialog.showModal();
}

function renderEnd(winner) {
  const ranking = [...state.players].sort((a, b) => netWorth(b) - netWorth(a));
  elements.winnerTitle.textContent = `${winner.icon} ${winner.name} 获胜`;
  playSound("win");
  elements.finalRanking.innerHTML = ranking.map((player, index) => `
    <article class="player-card ${player.bankrupt ? "bankrupt" : ""}">
      <div class="player-head">
        <span class="token" style="background:${player.color}">${player.icon}</span>
        <strong>第 ${index + 1} 名：${player.name}</strong>
        <span class="badge">总资产 ¥${netWorth(player)}</span>
      </div>
    </article>
  `).join("");
  showScreen("end");
}

function netWorth(player) {
  return player.cash + player.properties.reduce((total, index) => {
    const tile = state.board[index];
    return total + Math.floor((tile.price || 0) / 2) + (tile.houses || 0) * Math.floor((tile.houseCost || 0) / 2);
  }, 0);
}

function tileTypeName(type) {
  return {
    start: "起点",
    property: "城市地块",
    transit: "交通枢纽",
    utility: "公共事业",
    chance: "机会",
    fate: "命运",
    tax: "税费",
    jail: "监狱",
    parking: "免费停车",
    gotojail: "入狱",
  }[type] || type;
}

function addLog(message) {
  if (!state) return;
  state.logs.unshift(message);
}

function resetToSetup() {
  state = null;
  elements.diceDisplay.textContent = "🎲 -";
  showScreen("setup");
}

function randomDie() {
  return Math.floor(Math.random() * 6) + 1;
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

initSetup();
