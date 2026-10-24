const rows = [5, 4, 5, 4, 5],
    R = 5;
const colors = {
    0: "#2a2f3b",
    1: "#59a9ff",
    2: "#68d391",
    3: "#f6c85f",
    4: "#f08a5d",
    5: "#d17bff",
    6: "#ff6b8a",
    7: "#f3f4f6",
    8: "#7ce7df",
    9: "#ffb86c",
    10: "#c3a6ff",
};
let cells = [],
    board = {},
    currentShape = "custom",
    pieceLevels = [],
    recommendation = null,
    undoBoard = null,
    pieceBoard = {},
    nextPieceBoard = {},
    nextPieceLevels = [];
const shapes = {
    single: [[0, 0]],
    domino: [
        [0, 0],
        [1, 0],
    ],
    line3: [
        [0, 0],
        [1, 0],
        [2, 0],
    ],
    bend3: [
        [0, 0],
        [1, 0],
        [0, 1],
    ],
    custom: [[0, 0]],
};
function key(q, r) {
    return q + "," + r;
}
function parse(k) {
    return k.split(",").map(Number);
}
for (let r = 0; r < R; r++)
    for (let c = 0; c < rows[r]; c++) {
        let q = c - Math.floor(r / 2);
        cells.push({
            q,
            r,
            k: key(q, r),
            x: 333 - (38 + r * 50),
            y: 24 + (70 + (q + r / 2) * 58),
        });
        board[key(q, r)] = 0;
    }
const cellSet = new Set(cells.map((c) => c.k));
const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, -1],
    [-1, 1],
];
function neighbors(k) {
    let [q, r] = parse(k);
    return dirs
        .map(([dq, dr]) => key(q + dq, r + dr))
        .filter((n) => cellSet.has(n));
}
function polyPoints(cx, cy, s) {
    let a = [];
    for (let i = 0; i < 6; i++) {
        let ang = (Math.PI / 180) * (60 * i + 60);
        a.push(
            (cx + s * Math.cos(ang)).toFixed(1) +
                "," +
                (cy + s * Math.sin(ang)).toFixed(1),
        );
    }
    return a.join(" ");
}
function drawBoard(highlight = [], preview = [], highlightLevels = []) {
    let svg = document.querySelector("#board");
    svg.innerHTML = "";
    cells.forEach((c) => {
        let v = board[c.k] || 0;
        let p = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "polygon",
        );
        p.setAttribute("points", polyPoints(c.x, c.y, 27));
        p.setAttribute(
            "class",
            "cell " +
                (v ? "" : "empty") +
                (highlight.includes(c.k) ? " recommended" : "") +
                (preview.includes(c.k) ? " preview" : ""),
        );
        p.setAttribute(
            "fill",
            v ? colors[v] || "#ffffff" : "#2a2f3b",
        );
        p.addEventListener("click", () => {
            undoBoard = { ...board };
            board[c.k] = (board[c.k] + 1) % 11;
            recommendation = null;
            drawBoard();
            updateStats();
        });
        svg.appendChild(p);
        // 기존 레벨 숫자는 그대로 표시하고, 추천 위치가 빈칸이면
        // 해당 위치에 놓일 블록의 레벨 숫자도 함께 표시한다.
        if (v || highlight.includes(c.k)) {
            let t = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "text",
            );
            t.setAttribute("x", c.x);
            t.setAttribute("y", c.y);
            t.setAttribute("class", "celltext " + (highlight.includes(c.k) && "celltext-recommended"));
            const highlightIndex = highlight.indexOf(c.k);
            t.textContent = v || highlightLevels[highlightIndex] || "";
            svg.appendChild(t);
        }
    });
    document.querySelector("#emptyCount").textContent =
        cells.filter((c) => !board[c.k]).length;
}
function drawLegend() {
    let el = document.querySelector("#legend");
    el.innerHTML = "";
    for (let i = 1; i <= 10; i++) {
        let s = document.createElement("span");
        s.className = "swatch";
        s.style.background = colors[i];
        s.textContent = "레벨 " + i;
        el.appendChild(s);
    }
}
function renderPieceLevels() {
    // 전용 미니 보드에서 블록의 모양과 각 칸의 레벨을 직접 입력한다.
    const el = document.querySelector("#pieceLevels");
    el.innerHTML = "";

    const title = document.createElement("div");
    title.style.cssText = "width:100%;margin-bottom:8px;font-size:13px;color:#aeb8ca;";
    el.appendChild(title);

    const miniCells = [];
    const miniRows = [3, 2, 3];
    for (let r = 0; r < miniRows.length; r++) {
        for (let c = 0; c < miniRows[r]; c++) {
            const q = c - Math.floor(r / 2);
            miniCells.push({ q, r, k: key(q, r), x: 190 - (34 + r * 47), y: 50 + (q + r / 2) * 54 });
        }
    }
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 200 200");
    svg.setAttribute("width", "200");
    svg.setAttribute("height", "200");
    svg.style.cssText = "display:block;max-width:100%;overflow:visible;";

    const selected = Object.entries(pieceBoard)
        .filter(([, level]) => level > 0)
        .map(([k, level]) => ({ k, level, coords: parse(k) }));

    miniCells.forEach((c) => {
        const level = pieceBoard[c.k] || 0;
        const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        polygon.setAttribute("points", polyPoints(c.x, c.y, 23));
        polygon.setAttribute("fill", level ? colors[level] : "#2a2f3b");
        polygon.setAttribute("stroke", level ? "#dbe5f5" : "#596273");
        polygon.setAttribute("stroke-width", "1.5");
        polygon.style.cursor = "pointer";
        polygon.addEventListener("click", () => {
            const current = pieceBoard[c.k] || 0;
            if (current === 0) {
                if (selected.length >= 3) {
                    document.querySelector("#status").textContent = "블록은 최대 3칸까지 입력할 수 있습니다.";
                    return;
                }
                if (selected.length > 0) {
                    const adjacent = selected.some(({ coords }) => {
                        const [sq, sr] = coords;
                        return neighbors(key(sq, sr)).includes(c.k);
                    });
                    if (!adjacent) {
                        document.querySelector("#status").textContent = "블록의 새 칸은 기존 블록과 붙어 있어야 합니다.";
                        return;
                    }
                }
                pieceBoard[c.k] = 1;
            } else if (current < 10) {
                pieceBoard[c.k] = current + 1;
            } else {
                const remaining = selected.filter(item => item.k !== c.k);
                if (remaining.length > 0 && !isConnectedPiece(remaining)) {
                    document.querySelector("#status").textContent = "가운데 칸을 제거하면 블록이 분리되므로 먼저 바깥 칸을 제거하세요.";
                    return;
                }
                delete pieceBoard[c.k];
            }
            syncPieceFromBoard();
            recommendation = null;
            renderPieceLevels();
        });
        svg.appendChild(polygon);

        if (level > 0) {
            const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
            label.setAttribute("x", c.x);
            label.setAttribute("y", c.y + 5);
            label.setAttribute("text-anchor", "middle");
            label.setAttribute("font-size", "14");
            label.setAttribute("font-weight", "700");
            label.setAttribute("fill", "#18202c");
            label.style.pointerEvents = "none";
            label.textContent = String(level);
            svg.appendChild(label);
        }
    });
    el.appendChild(svg);

    const resetButton = document.createElement("button");
    resetButton.type = "button";
    resetButton.textContent = "블록 보드 초기화";
    resetButton.style.cssText = "display:block;margin-top:10px;padding:8px 12px;border:1px solid #596273;border-radius:8px;background:#252b37;color:#f3f4f6;cursor:pointer;z-index: 1;";
    resetButton.addEventListener("click", () => {
        pieceBoard = {};
        syncPieceFromBoard();
        recommendation = null;
        renderPieceLevels();
        document.querySelector("#status").textContent = "놓을 블록 보드를 초기화했습니다.";
    });
    el.appendChild(resetButton);
}

function renderNextPieceLevels() {
    // 전용 미니 보드에서 블록의 모양과 각 칸의 레벨을 직접 입력한다.
    const el = document.querySelector("#nextPieceLevels");
    el.innerHTML = "";

    const title = document.createElement("div");
    title.style.cssText = "width:100%;margin-bottom:8px;font-size:13px;color:#aeb8ca;";
    el.appendChild(title);

    const miniCells = [];
    const miniRows = [3, 2, 3];
    for (let r = 0; r < miniRows.length; r++) {
        for (let c = 0; c < miniRows[r]; c++) {
            const q = c - Math.floor(r / 2);
            miniCells.push({ q, r, k: key(q, r), x: 190 - (34 + r * 47), y: 70 + (q + r / 2) * 54 });
        }
    }
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 200 200");
    svg.setAttribute("width", "200");
    svg.setAttribute("height", "200");
    svg.style.cssText = "display:block;max-width:100%;overflow:visible;";

    const selected = Object.entries(nextPieceBoard)
        .filter(([, level]) => level > 0)
        .map(([k, level]) => ({ k, level, coords: parse(k) }));

    miniCells.forEach((c) => {
        const level = nextPieceBoard[c.k] || 0;
        const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        polygon.setAttribute("points", polyPoints(c.x, c.y, 23));
        polygon.setAttribute("fill", level ? colors[level] : "#2a2f3b");
        polygon.setAttribute("stroke", level ? "#dbe5f5" : "#596273");
        polygon.setAttribute("stroke-width", "1.5");
        polygon.style.cursor = "pointer";
        polygon.addEventListener("click", () => {
            const current = nextPieceBoard[c.k] || 0;
            if (current === 0) {
                if (selected.length >= 3) {
                    document.querySelector("#status").textContent = "블록은 최대 3칸까지 입력할 수 있습니다.";
                    return;
                }
                if (selected.length > 0) {
                    const adjacent = selected.some(({ coords }) => {
                        const [sq, sr] = coords;
                        return neighbors(key(sq, sr)).includes(c.k);
                    });
                    if (!adjacent) {
                        document.querySelector("#status").textContent = "블록의 새 칸은 기존 블록과 붙어 있어야 합니다.";
                        return;
                    }
                }
                nextPieceBoard[c.k] = 1;
            } else if (current < 10) {
                nextPieceBoard[c.k] = current + 1;
            } else {
                const remaining = selected.filter(item => item.k !== c.k);
                if (remaining.length > 0 && !isConnectedPiece(remaining)) {
                    document.querySelector("#status").textContent = "가운데 칸을 제거하면 블록이 분리되므로 먼저 바깥 칸을 제거하세요.";
                    return;
                }
                delete nextPieceBoard[c.k];
            }
            syncNextPieceFromBoard();
            recommendation = null;
            renderNextPieceLevels();
        });
        svg.appendChild(polygon);

        if (level > 0) {
            const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
            label.setAttribute("x", c.x);
            label.setAttribute("y", c.y + 5);
            label.setAttribute("text-anchor", "middle");
            label.setAttribute("font-size", "14");
            label.setAttribute("font-weight", "700");
            label.setAttribute("fill", "#18202c");
            label.style.pointerEvents = "none";
            label.textContent = String(level);
            svg.appendChild(label);
        }
    });
    el.appendChild(svg);

    const resetButton = document.createElement("button");
    resetButton.type = "button";
    resetButton.textContent = "블록 보드 초기화";
    resetButton.style.cssText = "display:block;margin-top:10px;padding:8px 12px;border:1px solid #596273;border-radius:8px;background:#252b37;color:#f3f4f6;cursor:pointer;z-index: 1;";
    resetButton.addEventListener("click", () => {
        nextPieceBoard = {};
        syncNextPieceFromBoard();
        recommendation = null;
        renderNextPieceLevels();
        document.querySelector("#status").textContent = "다음 블록 보드를 초기화했습니다.";
    });
    el.appendChild(resetButton);
}

function isConnectedPiece(items) {
    if (items.length <= 1) return true;
    const remaining = new Set(items.map(item => item.k));
    const visited = new Set();
    const stack = [items[0].k];
    while (stack.length) {
        const k = stack.pop();
        if (visited.has(k)) continue;
        visited.add(k);
        neighbors(k).forEach(n => {
            if (remaining.has(n) && !visited.has(n)) stack.push(n);
        });
    }
    return visited.size === remaining.size;
}

function syncPieceFromBoard() {
    const chosen = Object.entries(pieceBoard)
        .filter(([, level]) => level > 0)
        .map(([k, level]) => ({ coords: parse(k), level }));
    if (!chosen.length) {
        shapes.custom = [];
        pieceLevels = [];
        currentShape = "custom";
        return;
    }
    const minQ = Math.min(...chosen.map(item => item.coords[0]));
    const minR = Math.min(...chosen.map(item => item.coords[1]));
    shapes.custom = chosen.map(item => [item.coords[0] - minQ, item.coords[1] - minR]);
    pieceLevels = chosen.map(item => item.level);
    currentShape = "custom";
}
function syncNextPieceFromBoard() {
    const chosen = Object.entries(nextPieceBoard)
        .filter(([, level]) => level > 0)
        .map(([k, level]) => ({ coords: parse(k), level }));
    if (!chosen.length) {
        shapes.nextCustom = [];
        nextPieceLevels = [];
        return;
    }
    const minQ = Math.min(...chosen.map(item => item.coords[0]));
    const minR = Math.min(...chosen.map(item => item.coords[1]));
    shapes.nextCustom = chosen.map(item => [item.coords[0] - minQ, item.coords[1] - minR]);
    nextPieceLevels = chosen.map(item => item.level);
}
// 가능한 최초 병합 위치를 모두 분기한다. 확률은 확인 전까지 균등 가정.
// 두 번째 블록은 첫 병합 결과가 공개된 뒤 다시 최선의 수를 선택한다.
function scoreTwoMoves(first) {
    let expected = 0, bestNext = null, nextCount = 0;
    let representativeScore = -Infinity;
    for (const outcome of first.outcomes) {
        const base = scoreState(outcome.board, outcome.merges, currentShape, "unknown");
        let score = base, next = null, count = 0;
        if (nextPieceLevels.length) {
            const options = placements(outcome.board, "nextCustom", nextPieceLevels);
            count = options.length;
            if (!count) score = base - 180;
            else {
                score = -Infinity;
                for (const p of options) {
                    let value = 0;
                    for (const branch of p.outcomes) {
                        value += branch.prob * scoreState(branch.board, outcome.merges + branch.merges, "nextCustom", "unknown");
                    }
                    if (value > score) { score = value; next = p; }
                }
            }
        }
        expected += outcome.prob * score;
        nextCount += outcome.prob * count;
        if (outcome.prob > 0 && score > representativeScore) {
            representativeScore = score;
            bestNext = next;
        }
    }
    return { score: expected, next: bestNext, count: Math.round(nextCount) };
}
function rotate([q, r]) {
    return [-r, q + r];
}
function orientations(shape) {
    let base = shapes[shape],
        out = [],
        seen = new Set();
    for (let rot = 0; rot < 6; rot++) {
        let coords = base.map(([q, r]) => {
            let x = q,
                y = r;
            for (let i = 0; i < rot; i++) [x, y] = rotate([x, y]);
            return [x, y];
        });
        let minq = Math.min(...coords.map((p) => p[0])),
            minr = Math.min(...coords.map((p) => p[1]));
        coords = coords.map(([q, r]) => [q - minq, r - minr]);
        let order = coords.map((p) => p.join(",")).sort();
        let sig = order.join(";");
        if (!seen.has(sig)) {
            seen.add(sig);
            out.push(coords);
        }
    }
    return out;
}
function comps(b) {
    let seen = new Set(),
        result = [];
    for (let c of cells) {
        let k = c.k;
        if (!b[k] || seen.has(k)) continue;
        let level = b[k],
            stack = [k],
            comp = [];
        seen.add(k);
        while (stack.length) {
            let x = stack.pop();
            comp.push(x);
            for (let n of neighbors(x))
                if (!seen.has(n) && b[n] === level) {
                    seen.add(n);
                    stack.push(n);
                }
        }
        result.push({ level, cells: comp });
    }
    return result;
}
// 같은 레벨이 3개 이상 연결되어도, 이번 수로 영향을 받은 그룹만 합성한다.
// 기존에 놓여 있던 독립 그룹이 갑자기 합쳐지는 것을 방지한다.
function connectedSameLevel(b, start) {
    const level = b[start];
    if (!level) return [];
    const seen = new Set([start]);
    const stack = [start];
    while (stack.length) {
        const k = stack.pop();
        for (const n of neighbors(k)) {
            if (b[n] === level && !seen.has(n)) {
                seen.add(n);
                stack.push(n);
            }
        }
    }
    return [...seen];
}
// 병합에 참여한 '이번에 놓은 칸'이 1개면 그 칸에 고정,
// 2~3개면 해당 칸 각각을 후보로 분기. 연쇄 병합은 첫 결과 위치를 유지.
function simulatePlacementOutcomes(b, placement, levels) {
    const initial = { ...b };
    placement.forEach((k, i) => { initial[k] = levels[i]; });
    const results = [];
    function explore(out, active, roots, merges, prob, depth) {
        if (depth >= 40) { results.push({ board: out, merges, prob }); return; }
        const candidates = [], visited = new Set();
        for (const origin of active) {
            if (!out[origin] || out[origin] >= 10 || visited.has(origin)) continue;
            const group = connectedSameLevel(out, origin);
            group.forEach(k => visited.add(k));
            if (group.length < 3) continue;
            const chain = group.filter(k => roots.has(k));
            const fresh = group.filter(k => placement.includes(k) && !roots.has(k));
            const survivors = chain.length ? [chain[0]] : fresh.length ? fresh : [origin];
            candidates.push({ level: out[origin], group, survivors, chain: chain.length > 0 });
        }
        if (!candidates.length) { results.push({ board: out, merges, prob }); return; }
        candidates.sort((x,y) => x.level-y.level || Number(y.chain)-Number(x.chain));
        const { level, group, survivors } = candidates[0];
        for (const survivor of survivors) {
            const next = { ...out }, nextActive = new Set(active), nextRoots = new Set(roots);
            group.forEach(k => { next[k] = 0; nextActive.delete(k); nextRoots.delete(k); });
            next[survivor] = Math.min(10, level + (group.length >= 5 ? 2 : 1));
            nextActive.add(survivor);
            nextRoots.add(survivor);
            explore(next, nextActive, nextRoots, merges + 1, prob / survivors.length, depth + 1);
        }
    }
    explore(initial, new Set(placement), new Set(), 0, 1, 0);
    const unique = new Map();
    for (const item of results) {
        const signature = cells.map(c => item.board[c.k] || 0).join(',') + ':' + item.merges;
        if (unique.has(signature)) unique.get(signature).prob += item.prob;
        else unique.set(signature, item);
    }
    return [...unique.values()];
}
function placements(b, shape, levels) {
    if (!shapes[shape] || !shapes[shape].length || !levels.length) return [];
    const result = [], seen = new Set();
    for (const ori of orientations(shape)) for (const anchor of cells) {
        const pos = ori.map(([dq, dr]) => key(anchor.q + dq, anchor.r + dr));
        if (!pos.every(k => cellSet.has(k) && !b[k])) continue;
        // 레벨 순서까지 포함해야 같은 칸의 다른 회전 배치를 놓치지 않는다.
        const sig = pos.map((k,i) => k + ':' + levels[i]).sort().join('|');
        if (seen.has(sig)) continue;
        seen.add(sig);
        const outcomes = simulatePlacementOutcomes(b, pos, levels);
        const representative = outcomes.reduce((a,x) => x.prob > a.prob ? x : a, outcomes[0]);
        result.push({ pos, outcomes, board: representative.board, merges: representative.merges,
            expectedMerges: outcomes.reduce((sum,x) => sum + x.prob*x.merges, 0) });
    }
    return result;
}
function countPlacements(b, shape) {
    if (!shapes[shape] || !shapes[shape].length) return 0;
    let n = 0;
    for (let ori of orientations(shape))
        for (let anchor of cells) {
            let pos = ori.map(([dq, dr]) =>
                key(anchor.q + dq, anchor.r + dr),
            );
            if (pos.every((k) => cellSet.has(k) && !b[k])) n++;
        }
    return n;
}
// 현재 보드의 최고 레벨만 사용한다. 과거 최고 레벨은 기록하지 않는다.
function currentMaxLevel(b) {
    return Math.max(1, ...cells.map(c => b[c.k] || 0));
}
function minSpawnLevel(b) {
    return Math.max(1, currentMaxLevel(b) - 3);
}
// 새로 등장할 수 없는 낮은 레벨 그룹을 평가한다.
// 연결된 블록이 3개 이상이면 자체 합성이 가능하므로 막힌 칸으로 세지 않는다.
function strandedInfo(b) {
    const minLevel = minSpawnLevel(b);
    let blockedCells = 0, blockedGroups = 0, endangeredPairs = 0;
    for (const g of comps(b)) {
        if (g.level >= minLevel || g.cells.length >= 3) continue;
        blockedCells += g.cells.length;
        blockedGroups++;
        if (g.cells.length === 2) endangeredPairs++;
    }
    return { blockedCells, blockedGroups, endangeredPairs, minLevel };
}
function scoreState(b, merges, usedShape, nextShape) {
    let empty = cells.filter((c) => !b[c.k]).length;
    let compsNow = comps(b);
    let near = 0,
        mergeReady = 0;
    for (let g of compsNow) {
        if (g.cells.length === 2) mergeReady += 1;
        if (g.cells.length >= 3) near += g.cells.length;
    }
    let pairs = 0;
    for (let c of cells) {
        if (!b[c.k]) continue;
        for (let n of neighbors(c.k))
            if (n > c.k && b[n] === b[c.k]) pairs++;
    }
    let isolated = 0,
        usable = 0;
    for (let c of cells)
        if (!b[c.k]) {
            let ns = neighbors(c.k);
            if (ns.filter((n) => !b[n]).length === 0) isolated++;
            if (ns.filter((n) => !b[n]).length <= 1) usable++;
        }
    let mobility =
        countPlacements(b, "single") +
        countPlacements(b, "domino") +
        countPlacements(b, "line3") +
        countPlacements(b, "bend3");
    let nextMob = 0; // 다음 블록은 scoreTwoMoves에서 직접 시뮬레이션
    const stranded = strandedInfo(b);
    return (
        empty * 8 +
        mobility * 0.16 +
        nextMob * 0.9 +
        merges * 13 +
        pairs * 1.6 +
        mergeReady * 2.4 -
        isolated * 5 -
        usable * 0.7 -
        stranded.blockedCells * 22 -
        stranded.blockedGroups * 8 -
        stranded.endangeredPairs * 3
    );
}
function showNextMove(first) {
    const panel = document.querySelector("#nextMovePreview");
    if (!panel) return;
    if (!first || !first.nextRecommendation) {
        panel.textContent = nextPieceLevels.length ? "이 첫 배치 이후 다음 블록을 놓을 자리가 없습니다." : "다음 블록을 입력하면 2수 앞 탐색을 수행합니다.";
        return;
    }
    const second = first.nextRecommendation;
    const coordinates = second.pos.map((k, i) => {
        const c = cells.find(x => x.k === k);
        return `행${c.r + 1}·칸${c.q + Math.floor(c.r / 2) + 1} (레벨 ${nextPieceLevels[i]})`;
    }).join(", ");
}
function recommend() {
    if (!pieceLevels.length) {
        document.querySelector("#status").textContent = "놓을 블록을 먼저 입력하세요.";
        document.querySelector("#results").innerHTML = "";
        document.querySelector("#bestSummary").innerHTML = "";
        document.querySelector("#nextMovePreview").textContent = "";
        document.querySelector("#applyBest").disabled = true;
        recommendation = null;
        drawBoard();
        return;
    }
    let list = placements(board, currentShape, pieceLevels);
    document.querySelector("#fitCount").textContent = list.length;
    document.querySelector("#mergeCount").textContent = "—";
    let results = document.querySelector("#results"),
        status = document.querySelector("#status");
    results.innerHTML = "";
    recommendation = null;
    document.querySelector("#applyBest").disabled = true;
    if (!list.length) {
        status.textContent =
            "이 블록을 놓을 수 있는 위치가 없습니다. 입력한 보드와 블록을 확인하세요.";
        drawBoard();
        return;
    }
    list.forEach((p) => {
        const future = scoreTwoMoves(p);
        p.score = future.score;
        p.nextRecommendation = future.next;
        p.nextCount = future.count;
    });
    list.sort((a, b) => b.score - a.score);
    recommendation = list[0];
    document.querySelector("#mergeCount").textContent =
        recommendation.expectedMerges.toFixed(1);
    status.textContent = `첫 블록 배치 ${list.length}개에 대해 가능한 병합 위치와 다음 블록을 계산했습니다. 병합 위치별 동일 확률을 가정한 기대 점수입니다.`;
    let cellsBest = recommendation.pos;
    drawBoard(cellsBest, [], pieceLevels);
    showNextMove(recommendation);
    document.querySelector("#bestSummary").innerHTML =
        `<div class="stats"><div class="stat"><b>${recommendation.expectedMerges.toFixed(1)}</b><span>예상 연쇄 병합</span></div><div class="stat"><b>${cells.filter((c) => !recommendation.board[c.k]).length}</b><span>배치 후 빈칸</span></div><div class="stat"><b>${Math.round(recommendation.score)}</b><span>휴리스틱 점수</span></div></div>`;
    list.slice(0, 8).forEach((p, i) => {
        let d = document.createElement("div");
        d.className = "result" + (i === 0 ? " best" : "");
        let coords = p.pos
            .map((k) => {
                let c = cells.find((c) => c.k === k);
                return `행${c.r + 1}·칸${c.q + Math.floor(c.r / 2) + 1}`;
            })
            .join(", ");
        d.innerHTML = `<div><strong>${i + 1}위 · ${coords}</strong><small>첫 합성 ${p.expectedMerges.toFixed(1)}회 · 결과 ${p.outcomes.length}가지 · 다음 배치 ${p.nextCount}개 · 다음 합성 ${p.nextRecommendation ? p.nextRecommendation.merges : 0}회</small></div><span class="pill">${Math.round(p.score)}점</span>`;
        d.addEventListener("click", () => {
            recommendation = p;
            drawBoard(p.pos, [], pieceLevels);
            showNextMove(p);
            document.querySelector("#applyBest").disabled = false;
            document
                .querySelectorAll(".result")
                .forEach((x) => x.classList.remove("best"));
            d.classList.add("best");
        });
        results.appendChild(d);
    });
    document.querySelector("#applyBest").disabled = false;
}
function updateStats() {
    document.querySelector("#emptyCount").textContent =
        cells.filter((c) => !board[c.k]).length;
    document.querySelector("#fitCount").textContent =
        pieceLevels.length ? countPlacements(board, currentShape) : 0;
}
document.querySelectorAll("[data-shape]").forEach((b) => {
    b.style.display = "none";
    b.addEventListener("click", () => {
        document
            .querySelectorAll("[data-shape]")
            .forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        currentShape = b.dataset.shape;
        pieceLevels = Array(shapes[currentShape].length).fill(1);
        renderPieceLevels();
        recommendation = null;
        updateStats();
    });
});
document
    .querySelector("#clearBoard")
    .addEventListener("click", () => {
        undoBoard = { ...board };
        cells.forEach((c) => (board[c.k] = 0));
        recommendation = null;
        drawBoard();
        updateStats();
        document.querySelector("#results").innerHTML = "";
        document.querySelector("#bestSummary").innerHTML = "";
        document.querySelector("#nextMovePreview").textContent = "";
    });
document
    .querySelector("#demoBoard")
    .addEventListener("click", () => {
        undoBoard = { ...board };
        cells.forEach((c) => (board[c.k] = 0));
        [
            [0, 0, 1],
            [1, 0, 1],
            [2, 1, 2],
            [0, 2, 1],
            [1, 2, 1],
            [2, 2, 2],
            [3, 3, 3],
            [1, 4, 2],
            [2, 4, 2],
        ].forEach(([q, r, v]) => {
            let k = key(q, r);
            if (cellSet.has(k)) board[k] = v;
        });
        drawBoard();
        updateStats();
    });
document.querySelector("#undo").addEventListener("click", () => {
    if (undoBoard) {
        board = { ...undoBoard };
        undoBoard = null;
        drawBoard();
        updateStats();
    }
});
document
    .querySelector("#recommend")
    .addEventListener("click", recommend);
document
    .querySelector("#applyBest")
    .addEventListener("click", () => {
        if (!recommendation) return;
        undoBoard = { ...board };
        board = { ...recommendation.board };
        recommendation = null;
        drawBoard();
        updateStats();
        document.querySelector("#status").textContent =
            "대표 예상 결과를 적용했습니다. 병합 위치가 달랐다면 실제 게임 보드에 맞게 수정하세요.";
        document.querySelector("#applyBest").disabled = true;
        document.querySelector("#results").innerHTML = "";
        document.querySelector("#bestSummary").innerHTML = "";
        document.querySelector("#nextMovePreview").textContent = "";
    });
document
    .querySelector("#clearHighlight")
    .addEventListener("click", () => {
        drawBoard();
        recommendation = null;
        document.querySelector("#applyBest").disabled = true;
    });
// 시작할 때 두 미니 보드의 선택 상태를 반드시 비운다.
pieceBoard = {};
nextPieceBoard = {};
pieceLevels = [];
nextPieceLevels = [];
syncNextPieceFromBoard();
renderNextPieceLevels();
syncPieceFromBoard();
drawLegend();
renderPieceLevels();
drawBoard();
updateStats();