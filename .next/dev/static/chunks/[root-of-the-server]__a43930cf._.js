(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[turbopack]/browser/dev/hmr-client/hmr-client.ts [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/// <reference path="../../../shared/runtime-types.d.ts" />
/// <reference path="../../runtime/base/dev-globals.d.ts" />
/// <reference path="../../runtime/base/dev-protocol.d.ts" />
/// <reference path="../../runtime/base/dev-extensions.ts" />
__turbopack_context__.s([
    "connect",
    ()=>connect,
    "setHooks",
    ()=>setHooks,
    "subscribeToUpdate",
    ()=>subscribeToUpdate
]);
function connect({ addMessageListener, sendMessage, onUpdateError = console.error }) {
    addMessageListener((msg)=>{
        switch(msg.type){
            case 'turbopack-connected':
                handleSocketConnected(sendMessage);
                break;
            default:
                try {
                    if (Array.isArray(msg.data)) {
                        for(let i = 0; i < msg.data.length; i++){
                            handleSocketMessage(msg.data[i]);
                        }
                    } else {
                        handleSocketMessage(msg.data);
                    }
                    applyAggregatedUpdates();
                } catch (e) {
                    console.warn('[Fast Refresh] performing full reload\n\n' + "Fast Refresh will perform a full reload when you edit a file that's imported by modules outside of the React rendering tree.\n" + 'You might have a file which exports a React component but also exports a value that is imported by a non-React component file.\n' + 'Consider migrating the non-React component export to a separate file and importing it into both files.\n\n' + 'It is also possible the parent component of the component you edited is a class component, which disables Fast Refresh.\n' + 'Fast Refresh requires at least one parent function component in your React tree.');
                    onUpdateError(e);
                    location.reload();
                }
                break;
        }
    });
    const queued = globalThis.TURBOPACK_CHUNK_UPDATE_LISTENERS;
    if (queued != null && !Array.isArray(queued)) {
        throw new Error('A separate HMR handler was already registered');
    }
    globalThis.TURBOPACK_CHUNK_UPDATE_LISTENERS = {
        push: ([chunkPath, callback])=>{
            subscribeToChunkUpdate(chunkPath, sendMessage, callback);
        }
    };
    if (Array.isArray(queued)) {
        for (const [chunkPath, callback] of queued){
            subscribeToChunkUpdate(chunkPath, sendMessage, callback);
        }
    }
}
const updateCallbackSets = new Map();
function sendJSON(sendMessage, message) {
    sendMessage(JSON.stringify(message));
}
function resourceKey(resource) {
    return JSON.stringify({
        path: resource.path,
        headers: resource.headers || null
    });
}
function subscribeToUpdates(sendMessage, resource) {
    sendJSON(sendMessage, {
        type: 'turbopack-subscribe',
        ...resource
    });
    return ()=>{
        sendJSON(sendMessage, {
            type: 'turbopack-unsubscribe',
            ...resource
        });
    };
}
function handleSocketConnected(sendMessage) {
    for (const key of updateCallbackSets.keys()){
        subscribeToUpdates(sendMessage, JSON.parse(key));
    }
}
// we aggregate all pending updates until the issues are resolved
const chunkListsWithPendingUpdates = new Map();
function aggregateUpdates(msg) {
    const key = resourceKey(msg.resource);
    let aggregated = chunkListsWithPendingUpdates.get(key);
    if (aggregated) {
        aggregated.instruction = mergeChunkListUpdates(aggregated.instruction, msg.instruction);
    } else {
        chunkListsWithPendingUpdates.set(key, msg);
    }
}
function applyAggregatedUpdates() {
    if (chunkListsWithPendingUpdates.size === 0) return;
    hooks.beforeRefresh();
    for (const msg of chunkListsWithPendingUpdates.values()){
        triggerUpdate(msg);
    }
    chunkListsWithPendingUpdates.clear();
    finalizeUpdate();
}
function mergeChunkListUpdates(updateA, updateB) {
    let chunks;
    if (updateA.chunks != null) {
        if (updateB.chunks == null) {
            chunks = updateA.chunks;
        } else {
            chunks = mergeChunkListChunks(updateA.chunks, updateB.chunks);
        }
    } else if (updateB.chunks != null) {
        chunks = updateB.chunks;
    }
    let merged;
    if (updateA.merged != null) {
        if (updateB.merged == null) {
            merged = updateA.merged;
        } else {
            // Since `merged` is an array of updates, we need to merge them all into
            // one, consistent update.
            // Since there can only be `EcmascriptMergeUpdates` in the array, there is
            // no need to key on the `type` field.
            let update = updateA.merged[0];
            for(let i = 1; i < updateA.merged.length; i++){
                update = mergeChunkListEcmascriptMergedUpdates(update, updateA.merged[i]);
            }
            for(let i = 0; i < updateB.merged.length; i++){
                update = mergeChunkListEcmascriptMergedUpdates(update, updateB.merged[i]);
            }
            merged = [
                update
            ];
        }
    } else if (updateB.merged != null) {
        merged = updateB.merged;
    }
    return {
        type: 'ChunkListUpdate',
        chunks,
        merged
    };
}
function mergeChunkListChunks(chunksA, chunksB) {
    const chunks = {};
    for (const [chunkPath, chunkUpdateA] of Object.entries(chunksA)){
        const chunkUpdateB = chunksB[chunkPath];
        if (chunkUpdateB != null) {
            const mergedUpdate = mergeChunkUpdates(chunkUpdateA, chunkUpdateB);
            if (mergedUpdate != null) {
                chunks[chunkPath] = mergedUpdate;
            }
        } else {
            chunks[chunkPath] = chunkUpdateA;
        }
    }
    for (const [chunkPath, chunkUpdateB] of Object.entries(chunksB)){
        if (chunks[chunkPath] == null) {
            chunks[chunkPath] = chunkUpdateB;
        }
    }
    return chunks;
}
function mergeChunkUpdates(updateA, updateB) {
    if (updateA.type === 'added' && updateB.type === 'deleted' || updateA.type === 'deleted' && updateB.type === 'added') {
        return undefined;
    }
    if (updateA.type === 'partial') {
        invariant(updateA.instruction, 'Partial updates are unsupported');
    }
    if (updateB.type === 'partial') {
        invariant(updateB.instruction, 'Partial updates are unsupported');
    }
    return undefined;
}
function mergeChunkListEcmascriptMergedUpdates(mergedA, mergedB) {
    const entries = mergeEcmascriptChunkEntries(mergedA.entries, mergedB.entries);
    const chunks = mergeEcmascriptChunksUpdates(mergedA.chunks, mergedB.chunks);
    return {
        type: 'EcmascriptMergedUpdate',
        entries,
        chunks
    };
}
function mergeEcmascriptChunkEntries(entriesA, entriesB) {
    return {
        ...entriesA,
        ...entriesB
    };
}
function mergeEcmascriptChunksUpdates(chunksA, chunksB) {
    if (chunksA == null) {
        return chunksB;
    }
    if (chunksB == null) {
        return chunksA;
    }
    const chunks = {};
    for (const [chunkPath, chunkUpdateA] of Object.entries(chunksA)){
        const chunkUpdateB = chunksB[chunkPath];
        if (chunkUpdateB != null) {
            const mergedUpdate = mergeEcmascriptChunkUpdates(chunkUpdateA, chunkUpdateB);
            if (mergedUpdate != null) {
                chunks[chunkPath] = mergedUpdate;
            }
        } else {
            chunks[chunkPath] = chunkUpdateA;
        }
    }
    for (const [chunkPath, chunkUpdateB] of Object.entries(chunksB)){
        if (chunks[chunkPath] == null) {
            chunks[chunkPath] = chunkUpdateB;
        }
    }
    if (Object.keys(chunks).length === 0) {
        return undefined;
    }
    return chunks;
}
function mergeEcmascriptChunkUpdates(updateA, updateB) {
    if (updateA.type === 'added' && updateB.type === 'deleted') {
        // These two completely cancel each other out.
        return undefined;
    }
    if (updateA.type === 'deleted' && updateB.type === 'added') {
        const added = [];
        const deleted = [];
        const deletedModules = new Set(updateA.modules ?? []);
        const addedModules = new Set(updateB.modules ?? []);
        for (const moduleId of addedModules){
            if (!deletedModules.has(moduleId)) {
                added.push(moduleId);
            }
        }
        for (const moduleId of deletedModules){
            if (!addedModules.has(moduleId)) {
                deleted.push(moduleId);
            }
        }
        if (added.length === 0 && deleted.length === 0) {
            return undefined;
        }
        return {
            type: 'partial',
            added,
            deleted
        };
    }
    if (updateA.type === 'partial' && updateB.type === 'partial') {
        const added = new Set([
            ...updateA.added ?? [],
            ...updateB.added ?? []
        ]);
        const deleted = new Set([
            ...updateA.deleted ?? [],
            ...updateB.deleted ?? []
        ]);
        if (updateB.added != null) {
            for (const moduleId of updateB.added){
                deleted.delete(moduleId);
            }
        }
        if (updateB.deleted != null) {
            for (const moduleId of updateB.deleted){
                added.delete(moduleId);
            }
        }
        return {
            type: 'partial',
            added: [
                ...added
            ],
            deleted: [
                ...deleted
            ]
        };
    }
    if (updateA.type === 'added' && updateB.type === 'partial') {
        const modules = new Set([
            ...updateA.modules ?? [],
            ...updateB.added ?? []
        ]);
        for (const moduleId of updateB.deleted ?? []){
            modules.delete(moduleId);
        }
        return {
            type: 'added',
            modules: [
                ...modules
            ]
        };
    }
    if (updateA.type === 'partial' && updateB.type === 'deleted') {
        // We could eagerly return `updateB` here, but this would potentially be
        // incorrect if `updateA` has added modules.
        const modules = new Set(updateB.modules ?? []);
        if (updateA.added != null) {
            for (const moduleId of updateA.added){
                modules.delete(moduleId);
            }
        }
        return {
            type: 'deleted',
            modules: [
                ...modules
            ]
        };
    }
    // Any other update combination is invalid.
    return undefined;
}
function invariant(_, message) {
    throw new Error(`Invariant: ${message}`);
}
const CRITICAL = [
    'bug',
    'error',
    'fatal'
];
function compareByList(list, a, b) {
    const aI = list.indexOf(a) + 1 || list.length;
    const bI = list.indexOf(b) + 1 || list.length;
    return aI - bI;
}
const chunksWithIssues = new Map();
function emitIssues() {
    const issues = [];
    const deduplicationSet = new Set();
    for (const [_, chunkIssues] of chunksWithIssues){
        for (const chunkIssue of chunkIssues){
            if (deduplicationSet.has(chunkIssue.formatted)) continue;
            issues.push(chunkIssue);
            deduplicationSet.add(chunkIssue.formatted);
        }
    }
    sortIssues(issues);
    hooks.issues(issues);
}
function handleIssues(msg) {
    const key = resourceKey(msg.resource);
    let hasCriticalIssues = false;
    for (const issue of msg.issues){
        if (CRITICAL.includes(issue.severity)) {
            hasCriticalIssues = true;
        }
    }
    if (msg.issues.length > 0) {
        chunksWithIssues.set(key, msg.issues);
    } else if (chunksWithIssues.has(key)) {
        chunksWithIssues.delete(key);
    }
    emitIssues();
    return hasCriticalIssues;
}
const SEVERITY_ORDER = [
    'bug',
    'fatal',
    'error',
    'warning',
    'info',
    'log'
];
const CATEGORY_ORDER = [
    'parse',
    'resolve',
    'code generation',
    'rendering',
    'typescript',
    'other'
];
function sortIssues(issues) {
    issues.sort((a, b)=>{
        const first = compareByList(SEVERITY_ORDER, a.severity, b.severity);
        if (first !== 0) return first;
        return compareByList(CATEGORY_ORDER, a.category, b.category);
    });
}
const hooks = {
    beforeRefresh: ()=>{},
    refresh: ()=>{},
    buildOk: ()=>{},
    issues: (_issues)=>{}
};
function setHooks(newHooks) {
    Object.assign(hooks, newHooks);
}
function handleSocketMessage(msg) {
    sortIssues(msg.issues);
    handleIssues(msg);
    switch(msg.type){
        case 'issues':
            break;
        case 'partial':
            // aggregate updates
            aggregateUpdates(msg);
            break;
        default:
            // run single update
            const runHooks = chunkListsWithPendingUpdates.size === 0;
            if (runHooks) hooks.beforeRefresh();
            triggerUpdate(msg);
            if (runHooks) finalizeUpdate();
            break;
    }
}
function finalizeUpdate() {
    hooks.refresh();
    hooks.buildOk();
    // This is used by the Next.js integration test suite to notify it when HMR
    // updates have been completed.
    // TODO: Only run this in test environments (gate by `process.env.__NEXT_TEST_MODE`)
    if (globalThis.__NEXT_HMR_CB) {
        globalThis.__NEXT_HMR_CB();
        globalThis.__NEXT_HMR_CB = null;
    }
}
function subscribeToChunkUpdate(chunkListPath, sendMessage, callback) {
    return subscribeToUpdate({
        path: chunkListPath
    }, sendMessage, callback);
}
function subscribeToUpdate(resource, sendMessage, callback) {
    const key = resourceKey(resource);
    let callbackSet;
    const existingCallbackSet = updateCallbackSets.get(key);
    if (!existingCallbackSet) {
        callbackSet = {
            callbacks: new Set([
                callback
            ]),
            unsubscribe: subscribeToUpdates(sendMessage, resource)
        };
        updateCallbackSets.set(key, callbackSet);
    } else {
        existingCallbackSet.callbacks.add(callback);
        callbackSet = existingCallbackSet;
    }
    return ()=>{
        callbackSet.callbacks.delete(callback);
        if (callbackSet.callbacks.size === 0) {
            callbackSet.unsubscribe();
            updateCallbackSets.delete(key);
        }
    };
}
function triggerUpdate(msg) {
    const key = resourceKey(msg.resource);
    const callbackSet = updateCallbackSets.get(key);
    if (!callbackSet) {
        return;
    }
    for (const callback of callbackSet.callbacks){
        callback(msg);
    }
    if (msg.type === 'notFound') {
        // This indicates that the resource which we subscribed to either does not exist or
        // has been deleted. In either case, we should clear all update callbacks, so if a
        // new subscription is created for the same resource, it will send a new "subscribe"
        // message to the server.
        // No need to send an "unsubscribe" message to the server, it will have already
        // dropped the update stream before sending the "notFound" message.
        updateCallbackSets.delete(key);
    }
}
}),
"[project]/styles/styles.module.scss [client] (css module)", ((__turbopack_context__) => {

__turbopack_context__.v({
  "rootInfoPage": "styles-module-scss-module__U7p4tW__rootInfoPage",
  "subtitle": "styles-module-scss-module__U7p4tW__subtitle",
  "title": "styles-module-scss-module__U7p4tW__title",
});
}),
"[project]/styles/layout.module.scss [client] (css module)", ((__turbopack_context__) => {

__turbopack_context__.v({
  "Link": "layout-module-scss-module__sXLTvq__Link",
  "header": "layout-module-scss-module__sXLTvq__header",
  "image": "layout-module-scss-module__sXLTvq__image",
  "nav": "layout-module-scss-module__sXLTvq__nav",
});
}),
"[project]/assets/logotype.svg (static in ecmascript, tag client)", ((__turbopack_context__) => {

__turbopack_context__.v("/_next/static/media/logotype.117f6144.svg");}),
"[project]/assets/logotype.svg.mjs { IMAGE => \"[project]/assets/logotype.svg (static in ecmascript, tag client)\" } [client] (structured image object with data url, ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$logotype$2e$svg__$28$static__in__ecmascript$2c$__tag__client$29$__ = __turbopack_context__.i("[project]/assets/logotype.svg (static in ecmascript, tag client)");
;
const __TURBOPACK__default__export__ = {
    src: __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$logotype$2e$svg__$28$static__in__ecmascript$2c$__tag__client$29$__["default"],
    width: 214,
    height: 103,
    blurWidth: 0,
    blurHeight: 0
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/header.tsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "HeaderComponent",
    ()=>HeaderComponent
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$styles$2f$layout$2e$module$2e$scss__$5b$client$5d$__$28$css__module$29$__ = __turbopack_context__.i("[project]/styles/layout.module.scss [client] (css module)");
var __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$logotype$2e$svg$2e$mjs__$7b$__IMAGE__$3d3e$__$225b$project$5d2f$assets$2f$logotype$2e$svg__$28$static__in__ecmascript$2c$__tag__client$2922$__$7d$__$5b$client$5d$__$28$structured__image__object__with__data__url$2c$__ecmascript$29$__ = __turbopack_context__.i('[project]/assets/logotype.svg.mjs { IMAGE => "[project]/assets/logotype.svg (static in ecmascript, tag client)" } [client] (structured image object with data url, ecmascript)');
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/image.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$link$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/link.js [client] (ecmascript)");
;
;
;
;
;
const HeaderComponent = ()=>{
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
        className: __TURBOPACK__imported__module__$5b$project$5d2f$styles$2f$layout$2e$module$2e$scss__$5b$client$5d$__$28$css__module$29$__["default"].header,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                src: __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$logotype$2e$svg$2e$mjs__$7b$__IMAGE__$3d3e$__$225b$project$5d2f$assets$2f$logotype$2e$svg__$28$static__in__ecmascript$2c$__tag__client$2922$__$7d$__$5b$client$5d$__$28$structured__image__object__with__data__url$2c$__ecmascript$29$__["default"],
                alt: "logotypeSword",
                className: __TURBOPACK__imported__module__$5b$project$5d2f$styles$2f$layout$2e$module$2e$scss__$5b$client$5d$__$28$css__module$29$__["default"].image
            }, void 0, false, {
                fileName: "[project]/components/header.tsx",
                lineNumber: 9,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$styles$2f$layout$2e$module$2e$scss__$5b$client$5d$__$28$css__module$29$__["default"].nav,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$link$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                        href: "/",
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$styles$2f$layout$2e$module$2e$scss__$5b$client$5d$__$28$css__module$29$__["default"].Link,
                        children: "casa"
                    }, void 0, false, {
                        fileName: "[project]/components/header.tsx",
                        lineNumber: 11,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$link$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                        href: "/catalogs",
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$styles$2f$layout$2e$module$2e$scss__$5b$client$5d$__$28$css__module$29$__["default"].Link,
                        children: "catalogare"
                    }, void 0, false, {
                        fileName: "[project]/components/header.tsx",
                        lineNumber: 14,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/components/header.tsx",
                lineNumber: 10,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/components/header.tsx",
        lineNumber: 8,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_c = HeaderComponent;
var _c;
__turbopack_context__.k.register(_c, "HeaderComponent");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/styles/models.module.scss [client] (css module)", ((__turbopack_context__) => {

__turbopack_context__.v({
  "containerGrid": "models-module-scss-module__VmLSVW__containerGrid",
  "modelsImage": "models-module-scss-module__VmLSVW__modelsImage",
  "subtitle": "models-module-scss-module__VmLSVW__subtitle",
  "titleSection": "models-module-scss-module__VmLSVW__titleSection",
});
}),
"[project]/components/modelsClotch.tsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ModelsСlotch",
    ()=>ModelsСlotch
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/image.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$styles$2f$models$2e$module$2e$scss__$5b$client$5d$__$28$css__module$29$__ = __turbopack_context__.i("[project]/styles/models.module.scss [client] (css module)");
;
;
;
const ModelsСlotch = (props)=>{
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: __TURBOPACK__imported__module__$5b$project$5d2f$styles$2f$models$2e$module$2e$scss__$5b$client$5d$__$28$css__module$29$__["default"].titleSection,
                    children: props.titleSection
                }, void 0, false, {
                    fileName: "[project]/components/modelsClotch.tsx",
                    lineNumber: 18,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/components/modelsClotch.tsx",
                lineNumber: 17,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "models.containerGrid",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                        src: props.imageOne,
                        alt: "ImageModels",
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$styles$2f$models$2e$module$2e$scss__$5b$client$5d$__$28$css__module$29$__["default"].modelsImage
                    }, void 0, false, {
                        fileName: "[project]/components/modelsClotch.tsx",
                        lineNumber: 21,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                        src: props.imageTwo,
                        alt: "ImageModels",
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$styles$2f$models$2e$module$2e$scss__$5b$client$5d$__$28$css__module$29$__["default"].modelsImage
                    }, void 0, false, {
                        fileName: "[project]/components/modelsClotch.tsx",
                        lineNumber: 27,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                        src: props.imageThree,
                        alt: "ImageModels",
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$styles$2f$models$2e$module$2e$scss__$5b$client$5d$__$28$css__module$29$__["default"].modelsImage
                    }, void 0, false, {
                        fileName: "[project]/components/modelsClotch.tsx",
                        lineNumber: 32,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                        src: props.imageFour,
                        alt: "ImageModels",
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$styles$2f$models$2e$module$2e$scss__$5b$client$5d$__$28$css__module$29$__["default"].modelsImage
                    }, void 0, false, {
                        fileName: "[project]/components/modelsClotch.tsx",
                        lineNumber: 37,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/components/modelsClotch.tsx",
                lineNumber: 20,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/components/modelsClotch.tsx",
        lineNumber: 16,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_c = ModelsСlotch;
var _c;
__turbopack_context__.k.register(_c, "ModelsСlotch");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/assets/logotypeForHead.svg (static in ecmascript, tag client)", ((__turbopack_context__) => {

__turbopack_context__.v("/_next/static/media/logotypeForHead.d0743812.svg");}),
"[project]/assets/logotypeForHead.svg.mjs { IMAGE => \"[project]/assets/logotypeForHead.svg (static in ecmascript, tag client)\" } [client] (structured image object with data url, ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$logotypeForHead$2e$svg__$28$static__in__ecmascript$2c$__tag__client$29$__ = __turbopack_context__.i("[project]/assets/logotypeForHead.svg (static in ecmascript, tag client)");
;
const __TURBOPACK__default__export__ = {
    src: __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$logotypeForHead$2e$svg__$28$static__in__ecmascript$2c$__tag__client$29$__["default"],
    width: 72,
    height: 103,
    blurWidth: 0,
    blurHeight: 0
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/assets/menModel.webp (static in ecmascript, tag client)", ((__turbopack_context__) => {

__turbopack_context__.v("/_next/static/media/menModel.5dcda358.webp");}),
"[project]/assets/menModel.webp.mjs { IMAGE => \"[project]/assets/menModel.webp (static in ecmascript, tag client)\" } [client] (structured image object with data url, ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$menModel$2e$webp__$28$static__in__ecmascript$2c$__tag__client$29$__ = __turbopack_context__.i("[project]/assets/menModel.webp (static in ecmascript, tag client)");
;
const __TURBOPACK__default__export__ = {
    src: __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$menModel$2e$webp__$28$static__in__ecmascript$2c$__tag__client$29$__["default"],
    width: 563,
    height: 755,
    blurWidth: 6,
    blurHeight: 8,
    blurDataURL: "data:image/webp;base64,UklGRsYAAABXRUJQVlA4TLoAAAAvBcABAM1VICICHghACgMAAIC+7UobPxgBACgAIAAAAAAAAAAAAAAAAAAAAAAAAMBAQADYFttAKzMBAAAeiAQAAAAAwPk3AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAANgDkQAAAAAAOP8GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEcGNDMGQEgGgKYLGDACFIWDk5sfQeMispHIEAsOXxXFS+Gj/sPOCmMAlgk="
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/assets/winterTime/menCollection/WinterBlueMen.webp (static in ecmascript, tag client)", ((__turbopack_context__) => {

__turbopack_context__.v("/_next/static/media/WinterBlueMen.12f04803.webp");}),
"[project]/assets/winterTime/menCollection/WinterBlueMen.webp.mjs { IMAGE => \"[project]/assets/winterTime/menCollection/WinterBlueMen.webp (static in ecmascript, tag client)\" } [client] (structured image object with data url, ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$winterTime$2f$menCollection$2f$WinterBlueMen$2e$webp__$28$static__in__ecmascript$2c$__tag__client$29$__ = __turbopack_context__.i("[project]/assets/winterTime/menCollection/WinterBlueMen.webp (static in ecmascript, tag client)");
;
const __TURBOPACK__default__export__ = {
    src: __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$winterTime$2f$menCollection$2f$WinterBlueMen$2e$webp__$28$static__in__ecmascript$2c$__tag__client$29$__["default"],
    width: 736,
    height: 1104,
    blurWidth: 5,
    blurHeight: 8,
    blurDataURL: "data:image/webp;base64,UklGRuYAAABXRUJQVlA4TNoAAAAvBMABAM1VICICHgiACQMAAADPiKUMACA4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQA1Emtid4KAADAAwGogQAAADj/rlL2/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgYAZuZzgMBOEIAAAA4/3ojkQHEewQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAaFB2226R8X2tlQdn74b0CRfxfk0j8UlUwlL+H6iFlMOR606l35y6r37OIT3SWli9xwOQ/wQGwMT392Bk0boa0i0iJ13Nl2NzAw=="
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/assets/winterTime/menCollection/WinterWhiteMen.webp (static in ecmascript, tag client)", ((__turbopack_context__) => {

__turbopack_context__.v("/_next/static/media/WinterWhiteMen.c68087ff.webp");}),
"[project]/assets/winterTime/menCollection/WinterWhiteMen.webp.mjs { IMAGE => \"[project]/assets/winterTime/menCollection/WinterWhiteMen.webp (static in ecmascript, tag client)\" } [client] (structured image object with data url, ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$winterTime$2f$menCollection$2f$WinterWhiteMen$2e$webp__$28$static__in__ecmascript$2c$__tag__client$29$__ = __turbopack_context__.i("[project]/assets/winterTime/menCollection/WinterWhiteMen.webp (static in ecmascript, tag client)");
;
const __TURBOPACK__default__export__ = {
    src: __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$winterTime$2f$menCollection$2f$WinterWhiteMen$2e$webp__$28$static__in__ecmascript$2c$__tag__client$29$__["default"],
    width: 736,
    height: 1266,
    blurWidth: 5,
    blurHeight: 8,
    blurDataURL: "data:image/webp;base64,UklGRt0AAABXRUJQVlA4TNEAAAAvBMABAM1VICICHgiACQMAAICcgLX/xQlyAAJHAACA4AAgAAAAAAAAAAAAAAAAAOAAAMDBgL8k2QAAADwQkBMAAACA878tEggBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAVEHb3gMBOQEAAAA4//slEAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAk9j2kWWVypG3Ymgxv5msB+VqPPMPHzvK92bcHH1u2MfhvTXdnZNN/MK47x8JukTwwSVjxFAITBATorM4pBUAAAA="
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/assets/winterTime/menCollection/WinterBrownMen.webp (static in ecmascript, tag client)", ((__turbopack_context__) => {

__turbopack_context__.v("/_next/static/media/WinterBrownMen.4f314290.webp");}),
"[project]/assets/winterTime/menCollection/WinterBrownMen.webp.mjs { IMAGE => \"[project]/assets/winterTime/menCollection/WinterBrownMen.webp (static in ecmascript, tag client)\" } [client] (structured image object with data url, ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$winterTime$2f$menCollection$2f$WinterBrownMen$2e$webp__$28$static__in__ecmascript$2c$__tag__client$29$__ = __turbopack_context__.i("[project]/assets/winterTime/menCollection/WinterBrownMen.webp (static in ecmascript, tag client)");
;
const __TURBOPACK__default__export__ = {
    src: __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$winterTime$2f$menCollection$2f$WinterBrownMen$2e$webp__$28$static__in__ecmascript$2c$__tag__client$29$__["default"],
    width: 735,
    height: 981,
    blurWidth: 6,
    blurHeight: 8,
    blurDataURL: "data:image/webp;base64,UklGRt4AAABXRUJQVlA4TNIAAAAvBcABAM1VICICHgiADQIAAIDenidHlANAPwAQAOAAAAAAAAAAAAAAAAAAQDgHAAAAHQCgYPi7p/YDAAA8EGwQAAAAgPPfHwQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAID6PBBsGwAAAIDzT9YDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAoY309wuGbV+n580BEITmbCrHgUES99/BXQwcwY/RPYNiKziU+QBDuDdm7FBqVky+gC0GQ3UnYZTNqG1f7d9qFwE="
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/assets/winterTime/menCollection/WinterGreenMen.webp (static in ecmascript, tag client)", ((__turbopack_context__) => {

__turbopack_context__.v("/_next/static/media/WinterGreenMen.70afb973.webp");}),
"[project]/assets/winterTime/menCollection/WinterGreenMen.webp.mjs { IMAGE => \"[project]/assets/winterTime/menCollection/WinterGreenMen.webp (static in ecmascript, tag client)\" } [client] (structured image object with data url, ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$winterTime$2f$menCollection$2f$WinterGreenMen$2e$webp__$28$static__in__ecmascript$2c$__tag__client$29$__ = __turbopack_context__.i("[project]/assets/winterTime/menCollection/WinterGreenMen.webp (static in ecmascript, tag client)");
;
const __TURBOPACK__default__export__ = {
    src: __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$winterTime$2f$menCollection$2f$WinterGreenMen$2e$webp__$28$static__in__ecmascript$2c$__tag__client$29$__["default"],
    width: 736,
    height: 925,
    blurWidth: 6,
    blurHeight: 8,
    blurDataURL: "data:image/webp;base64,UklGRu0AAABXRUJQVlA4TOEAAAAvBcABAM1VICICHghADgIAAID7ssGLDBijASkAAAIAAAAAAAAAAAAAAAAAAAAAAAAABHgAGTP/GQ8AAOCBANRAAAAAnH+rq80w7z0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgDwF71eSCoVhAAAADnX98cAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAc60X+eC6noqcNH97Y4yYwQlXYSWwcukT3hf2o5CXr/NVHyJreEkjwbhTldhZfMcUn4b/nav3xSe75SDAGPFDnyFz5doo3XrSWketBA4A"
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/assets/winterTime/womenCollection/WinterBrownWomen.webp (static in ecmascript, tag client)", ((__turbopack_context__) => {

__turbopack_context__.v("/_next/static/media/WinterBrownWomen.ef710675.webp");}),
"[project]/assets/winterTime/womenCollection/WinterBrownWomen.webp.mjs { IMAGE => \"[project]/assets/winterTime/womenCollection/WinterBrownWomen.webp (static in ecmascript, tag client)\" } [client] (structured image object with data url, ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$winterTime$2f$womenCollection$2f$WinterBrownWomen$2e$webp__$28$static__in__ecmascript$2c$__tag__client$29$__ = __turbopack_context__.i("[project]/assets/winterTime/womenCollection/WinterBrownWomen.webp (static in ecmascript, tag client)");
;
const __TURBOPACK__default__export__ = {
    src: __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$winterTime$2f$womenCollection$2f$WinterBrownWomen$2e$webp__$28$static__in__ecmascript$2c$__tag__client$29$__["default"],
    width: 736,
    height: 1104,
    blurWidth: 5,
    blurHeight: 8,
    blurDataURL: "data:image/webp;base64,UklGRt4AAABXRUJQVlA4TNIAAAAvBMABAM1VICICHgiACQMAAABWsBM6HAAAAAAABAAAAAAAAAAAAADggAAAAAAAEACOQ0fIV/9UGwAAgAcCbAIAAABw/t+LAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAg+Nt8HgiwCQAAAMD5b/v+CgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAgK5HxnunfOo4MKiPWla1HTDwBXV8jW9mdWRHxyTIBGH01CazM8pL+vJdwBz0amPCGAI0QAZqwR7Ot6/GwE+++QE="
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/assets/winterTime/womenCollection/WinterBlueWomen.webp (static in ecmascript, tag client)", ((__turbopack_context__) => {

__turbopack_context__.v("/_next/static/media/WinterBlueWomen.462b77bd.webp");}),
"[project]/assets/winterTime/womenCollection/WinterBlueWomen.webp.mjs { IMAGE => \"[project]/assets/winterTime/womenCollection/WinterBlueWomen.webp (static in ecmascript, tag client)\" } [client] (structured image object with data url, ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$winterTime$2f$womenCollection$2f$WinterBlueWomen$2e$webp__$28$static__in__ecmascript$2c$__tag__client$29$__ = __turbopack_context__.i("[project]/assets/winterTime/womenCollection/WinterBlueWomen.webp (static in ecmascript, tag client)");
;
const __TURBOPACK__default__export__ = {
    src: __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$winterTime$2f$womenCollection$2f$WinterBlueWomen$2e$webp__$28$static__in__ecmascript$2c$__tag__client$29$__["default"],
    width: 735,
    height: 1053,
    blurWidth: 6,
    blurHeight: 8,
    blurDataURL: "data:image/webp;base64,UklGRuwAAABXRUJQVlA4TOAAAAAvBcABAM1VICICHgiADQIAAABAPBke1CBAADkBAAAAAAAAAAAAAAAAADgAAAAABAFIADnHsK6btQMAADwQtBMIAACA8//1LwABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAgGR29uaBoB0hAAAAnP/7f9sVAIEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQ5bRFxv0tsjUi0pQ1dfBq7m/KnLEaqz0eMHW2y3osHfztfO7zXoxbDx3D5KECwgv8cWjSP8cKL9ZXlqfkIu+d7bI0jkKwtPmB9X6EYA=="
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/assets/winterTime/womenCollection/WinterGreenWomen.webp (static in ecmascript, tag client)", ((__turbopack_context__) => {

__turbopack_context__.v("/_next/static/media/WinterGreenWomen.5069f742.webp");}),
"[project]/assets/winterTime/womenCollection/WinterGreenWomen.webp.mjs { IMAGE => \"[project]/assets/winterTime/womenCollection/WinterGreenWomen.webp (static in ecmascript, tag client)\" } [client] (structured image object with data url, ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$winterTime$2f$womenCollection$2f$WinterGreenWomen$2e$webp__$28$static__in__ecmascript$2c$__tag__client$29$__ = __turbopack_context__.i("[project]/assets/winterTime/womenCollection/WinterGreenWomen.webp (static in ecmascript, tag client)");
;
const __TURBOPACK__default__export__ = {
    src: __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$winterTime$2f$womenCollection$2f$WinterGreenWomen$2e$webp__$28$static__in__ecmascript$2c$__tag__client$29$__["default"],
    width: 736,
    height: 1259,
    blurWidth: 5,
    blurHeight: 8,
    blurDataURL: "data:image/webp;base64,UklGRt8AAABXRUJQVlA4TNMAAAAvBMABAM1VICICHgiACQMAAID7BzjquHGgwgQAAAAcAAAAAAAAAAAAAAEAAAABAAAcAAkczrNMEwAAADwQABIAAACA86+qYGwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAws9ZfHghIDQAAAMD5/xUMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABjQ/1HJr259xPnzke+wgFYpL9E/KZLJHROv6urqRH8CtWfqTSxcEAaol+jkMSIfqjd1ibkCneirBuemuugyMrZyoADAA=="
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/assets/winterTime/womenCollection/WinterWhiteWomen.webp (static in ecmascript, tag client)", ((__turbopack_context__) => {

__turbopack_context__.v("/_next/static/media/WinterWhiteWomen.8a79b65b.webp");}),
"[project]/assets/winterTime/womenCollection/WinterWhiteWomen.webp.mjs { IMAGE => \"[project]/assets/winterTime/womenCollection/WinterWhiteWomen.webp (static in ecmascript, tag client)\" } [client] (structured image object with data url, ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$winterTime$2f$womenCollection$2f$WinterWhiteWomen$2e$webp__$28$static__in__ecmascript$2c$__tag__client$29$__ = __turbopack_context__.i("[project]/assets/winterTime/womenCollection/WinterWhiteWomen.webp (static in ecmascript, tag client)");
;
const __TURBOPACK__default__export__ = {
    src: __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$winterTime$2f$womenCollection$2f$WinterWhiteWomen$2e$webp__$28$static__in__ecmascript$2c$__tag__client$29$__["default"],
    width: 736,
    height: 1092,
    blurWidth: 5,
    blurHeight: 8,
    blurDataURL: "data:image/webp;base64,UklGRtwAAABXRUJQVlA4TNAAAAAvBMABAM1VICICHgiACQMAAIBUsqQP/eIEsAEBAAAAAAAAAACAAwAAAAAAAAAAAACQgDsQnPxcxw8AAOCBgCMgAAAAnP9tnwIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABD/mweCagUBAABw/rV8BwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHNhekdv7HxC/zZcvM0nM8PiMK7ywDhT52b+HbYBHNHM/zJVWL4OIzuXennSdpIvl5gwe/wc7yU6qrdQGEhED"
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/assets/summerTime/menCollection/SummerBlueMen.webp (static in ecmascript, tag client)", ((__turbopack_context__) => {

__turbopack_context__.v("/_next/static/media/SummerBlueMen.0df55845.webp");}),
"[project]/assets/summerTime/menCollection/SummerBlueMen.webp.mjs { IMAGE => \"[project]/assets/summerTime/menCollection/SummerBlueMen.webp (static in ecmascript, tag client)\" } [client] (structured image object with data url, ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$summerTime$2f$menCollection$2f$SummerBlueMen$2e$webp__$28$static__in__ecmascript$2c$__tag__client$29$__ = __turbopack_context__.i("[project]/assets/summerTime/menCollection/SummerBlueMen.webp (static in ecmascript, tag client)");
;
const __TURBOPACK__default__export__ = {
    src: __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$summerTime$2f$menCollection$2f$SummerBlueMen$2e$webp__$28$static__in__ecmascript$2c$__tag__client$29$__["default"],
    width: 736,
    height: 922,
    blurWidth: 6,
    blurHeight: 8,
    blurDataURL: "data:image/webp;base64,UklGRvEAAABXRUJQVlA4TOUAAAAvBcABAM1VICICHgjAEQIAAIDfb33zDAEAQAAAAAB6AAAIAAAAAAAAAAAAgAABAJAAAMgQQEWAuQcAAHggaEcIAAAA5//2VoEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIHBcte+BAOQgAAAAnH9/T0n4PeE/AAMAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAbAQthk00dec4NwxNKNkUIsvxxb5ZNraNKTYv5b3td5KL/ALAlM11zvsvjUjxBA6But6twNIEDOqP+nvEwjZy/lo07qd6jECpabSX727k8KV+kNAA=="
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/assets/summerTime/menCollection/SummerWhiteMen.webp (static in ecmascript, tag client)", ((__turbopack_context__) => {

__turbopack_context__.v("/_next/static/media/SummerWhiteMen.f98312a6.webp");}),
"[project]/assets/summerTime/menCollection/SummerWhiteMen.webp.mjs { IMAGE => \"[project]/assets/summerTime/menCollection/SummerWhiteMen.webp (static in ecmascript, tag client)\" } [client] (structured image object with data url, ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$summerTime$2f$menCollection$2f$SummerWhiteMen$2e$webp__$28$static__in__ecmascript$2c$__tag__client$29$__ = __turbopack_context__.i("[project]/assets/summerTime/menCollection/SummerWhiteMen.webp (static in ecmascript, tag client)");
;
const __TURBOPACK__default__export__ = {
    src: __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$summerTime$2f$menCollection$2f$SummerWhiteMen$2e$webp__$28$static__in__ecmascript$2c$__tag__client$29$__["default"],
    width: 679,
    height: 1200,
    blurWidth: 5,
    blurHeight: 8,
    blurDataURL: "data:image/webp;base64,UklGRugAAABXRUJQVlA4TNwAAAAvBMABAM1VICICHgiACQMAAIA7F+Cp5AfBAQAAAAgAAAAAAAAAAEAAAAcAAAAAOAIsANBxTBOYfQAAADwQgBMIAACA82/bbDGcgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAoAAPry0PBMCEAQAA4Pwl1VcIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAxHBL27YVWdZk9mduAFJ2p+JVFLqxWSMKjjhZIlUVyje4jn8XWVvRTFes0RHZT+Vgt58Pdmt/YrHF4hVAKn+FfGaOHo7eievNB98d"
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/assets/summerTime/menCollection/SummerBrownMen.webp (static in ecmascript, tag client)", ((__turbopack_context__) => {

__turbopack_context__.v("/_next/static/media/SummerBrownMen.fd70adc1.webp");}),
"[project]/assets/summerTime/menCollection/SummerBrownMen.webp.mjs { IMAGE => \"[project]/assets/summerTime/menCollection/SummerBrownMen.webp (static in ecmascript, tag client)\" } [client] (structured image object with data url, ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$summerTime$2f$menCollection$2f$SummerBrownMen$2e$webp__$28$static__in__ecmascript$2c$__tag__client$29$__ = __turbopack_context__.i("[project]/assets/summerTime/menCollection/SummerBrownMen.webp (static in ecmascript, tag client)");
;
const __TURBOPACK__default__export__ = {
    src: __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$summerTime$2f$menCollection$2f$SummerBrownMen$2e$webp__$28$static__in__ecmascript$2c$__tag__client$29$__["default"],
    width: 736,
    height: 736,
    blurWidth: 8,
    blurHeight: 8,
    blurDataURL: "data:image/webp;base64,UklGRiMBAABXRUJQVlA4TBcBAAAvB8ABAM1VICICHgiADQIAAABfQe8VEghBJQAAAAAAAAAAAAAAAEAAAAAAAAAHBAARAZJT5V13vjEAAAAPBMAGAQAA4Pz377+3Gmd/6gAAAgAAAAAAAAAAAAAAAAAAAAAAAAABAAAACCTOtfFAAHAQAQAAzv9vu/uCCAAAAIAAAAAAAAAAAAAAAAAAAAAgAcACAAChAaCumnVbLJMtcr4H+jFxVcAPVbe7G4SFq/25d+3Il1eV+7hWCx8rAJTU5yylhuTnaI7znfi8nRut/ZowteSoO2uDpbMb//vpzeZC9h8JlacKuawXcChYrjrtbVzF1OSn4MexnGI2mRWKjAEgkVZ0JaYtrNaTRQSMKiJ5w2iKPbInEQgA"
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/assets/summerTime/menCollection/SummerGreenMen.webp (static in ecmascript, tag client)", ((__turbopack_context__) => {

__turbopack_context__.v("/_next/static/media/SummerGreenMen.4d249e11.webp");}),
"[project]/assets/summerTime/menCollection/SummerGreenMen.webp.mjs { IMAGE => \"[project]/assets/summerTime/menCollection/SummerGreenMen.webp (static in ecmascript, tag client)\" } [client] (structured image object with data url, ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$summerTime$2f$menCollection$2f$SummerGreenMen$2e$webp__$28$static__in__ecmascript$2c$__tag__client$29$__ = __turbopack_context__.i("[project]/assets/summerTime/menCollection/SummerGreenMen.webp (static in ecmascript, tag client)");
;
const __TURBOPACK__default__export__ = {
    src: __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$summerTime$2f$menCollection$2f$SummerGreenMen$2e$webp__$28$static__in__ecmascript$2c$__tag__client$29$__["default"],
    width: 736,
    height: 883,
    blurWidth: 7,
    blurHeight: 8,
    blurDataURL: "data:image/webp;base64,UklGRgMBAABXRUJQVlA4TPcAAAAvBsABAM1VICICHgiADQIAAACY51LkAAAAEAAAAAAIAAAAAAAAAAAAAAAAAAACAECg1pi16P6v3wEAADwQgCMEAACA899te9QXAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACFDIb3/ngQAUMQAAAJx/XbX9asAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAB4YObJ/xe5jddjJt1rKqoPxzbTBPkNzsc+K7p/27LYICVVO+IT9D6yohDMdtFPurTcELHGdYKqi/01wWnJNc5RWWFkF7W/RDoL8CHX9WwzgtaBYUdkwze1IuKF1aBw/+5MpakzAA=="
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/assets/summerTime/womenCollection/SummerBlueWomen.webp (static in ecmascript, tag client)", ((__turbopack_context__) => {

__turbopack_context__.v("/_next/static/media/SummerBlueWomen.1c8fcfe4.webp");}),
"[project]/assets/summerTime/womenCollection/SummerBlueWomen.webp.mjs { IMAGE => \"[project]/assets/summerTime/womenCollection/SummerBlueWomen.webp (static in ecmascript, tag client)\" } [client] (structured image object with data url, ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$summerTime$2f$womenCollection$2f$SummerBlueWomen$2e$webp__$28$static__in__ecmascript$2c$__tag__client$29$__ = __turbopack_context__.i("[project]/assets/summerTime/womenCollection/SummerBlueWomen.webp (static in ecmascript, tag client)");
;
const __TURBOPACK__default__export__ = {
    src: __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$summerTime$2f$womenCollection$2f$SummerBlueWomen$2e$webp__$28$static__in__ecmascript$2c$__tag__client$29$__["default"],
    width: 736,
    height: 980,
    blurWidth: 6,
    blurHeight: 8,
    blurDataURL: "data:image/webp;base64,UklGRu8AAABXRUJQVlA4TOMAAAAvBcABAM1VICICHgiADQIAAIDvOfcLEOAEACAAAQAAAAAAAAAAAAAAAAAAAAAAkAdEkh8OxHo5/zcAAAAPBC2FAQAA4Pz/excADAYBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYZ6k8ELQjBAAAgPPf/7fLcQgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEBABAFPWi9yfu5aOvdmafDOoi8xfitMkkQCJJluf/t8FmOgqMq+1npOoRPhpfb5lXuv7WOjoG22r5ypXBRdKDBjQ2MP0ZNwMdKT47YO+FXbeMQA="
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/assets/summerTime/womenCollection/SummerWhiteWomen.webp (static in ecmascript, tag client)", ((__turbopack_context__) => {

__turbopack_context__.v("/_next/static/media/SummerWhiteWomen.a117fe78.webp");}),
"[project]/assets/summerTime/womenCollection/SummerWhiteWomen.webp.mjs { IMAGE => \"[project]/assets/summerTime/womenCollection/SummerWhiteWomen.webp (static in ecmascript, tag client)\" } [client] (structured image object with data url, ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$summerTime$2f$womenCollection$2f$SummerWhiteWomen$2e$webp__$28$static__in__ecmascript$2c$__tag__client$29$__ = __turbopack_context__.i("[project]/assets/summerTime/womenCollection/SummerWhiteWomen.webp (static in ecmascript, tag client)");
;
const __TURBOPACK__default__export__ = {
    src: __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$summerTime$2f$womenCollection$2f$SummerWhiteWomen$2e$webp__$28$static__in__ecmascript$2c$__tag__client$29$__["default"],
    width: 736,
    height: 980,
    blurWidth: 6,
    blurHeight: 8,
    blurDataURL: "data:image/webp;base64,UklGRucAAABXRUJQVlA4TNsAAAAvBcABAM1VICICHghADgIAAIBt3fYzQgEpIAAACAAAAAAAAAAAAAAAAAAAAAAAAACAwBMMeWBN6h8AAMADAYlBAAAAOP+7r1IgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAZssfdAQFIgAAAAzn9nvwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOCrm0jev0c5ucO+Rk0SArk8nwebS6wgmx6zqIDQmF7Hq/fROFQV/g6/l7yOMfOTeax17PKvuL/Pgoy7y+o09xt6dGiQac80fQwA"
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/assets/summerTime/womenCollection/SummerBrownWomen.webp (static in ecmascript, tag client)", ((__turbopack_context__) => {

__turbopack_context__.v("/_next/static/media/SummerBrownWomen.339a808f.webp");}),
"[project]/assets/summerTime/womenCollection/SummerBrownWomen.webp.mjs { IMAGE => \"[project]/assets/summerTime/womenCollection/SummerBrownWomen.webp (static in ecmascript, tag client)\" } [client] (structured image object with data url, ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$summerTime$2f$womenCollection$2f$SummerBrownWomen$2e$webp__$28$static__in__ecmascript$2c$__tag__client$29$__ = __turbopack_context__.i("[project]/assets/summerTime/womenCollection/SummerBrownWomen.webp (static in ecmascript, tag client)");
;
const __TURBOPACK__default__export__ = {
    src: __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$summerTime$2f$womenCollection$2f$SummerBrownWomen$2e$webp__$28$static__in__ecmascript$2c$__tag__client$29$__["default"],
    width: 736,
    height: 883,
    blurWidth: 7,
    blurHeight: 8,
    blurDataURL: "data:image/webp;base64,UklGRgEBAABXRUJQVlA4TPUAAAAvBsABAM1VICICHghADgIAAIArIRNChIAATAAEAAAAAAAAAAAAAIACAIAgAACwAAA0CqFSIxQfVQcAAOCBgO0gAAAAnP/dVrMCgAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQACs0PseCEAKAwAAwPnfZbABDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAjxGWt+9X/UceLg+8Ld2c6Xf4AQBMCunRXSpbkEL4SxTEfN5ih5MARIHCzrFmm+Gu7b58Y4zY7n8Sd1ZTvaVXvHX3b13lc4frHJhT5SIDP+m4DqpYgsZq5pP/Mp/V3BLtotMKGwA="
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/assets/summerTime/womenCollection/SummerGreenWomen.webp (static in ecmascript, tag client)", ((__turbopack_context__) => {

__turbopack_context__.v("/_next/static/media/SummerGreenWomen.62f0fc8e.webp");}),
"[project]/assets/summerTime/womenCollection/SummerGreenWomen.webp.mjs { IMAGE => \"[project]/assets/summerTime/womenCollection/SummerGreenWomen.webp (static in ecmascript, tag client)\" } [client] (structured image object with data url, ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$summerTime$2f$womenCollection$2f$SummerGreenWomen$2e$webp__$28$static__in__ecmascript$2c$__tag__client$29$__ = __turbopack_context__.i("[project]/assets/summerTime/womenCollection/SummerGreenWomen.webp (static in ecmascript, tag client)");
;
const __TURBOPACK__default__export__ = {
    src: __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$summerTime$2f$womenCollection$2f$SummerGreenWomen$2e$webp__$28$static__in__ecmascript$2c$__tag__client$29$__["default"],
    width: 736,
    height: 883,
    blurWidth: 7,
    blurHeight: 8,
    blurDataURL: "data:image/webp;base64,UklGRvcAAABXRUJQVlA4TOsAAAAvBsABAM1VICICHghADgIAAID/20WBfewVDAgAACAAAAAAAAAAAAAAAAAAACAAAABAAACCCRBk2wAAADwQtBwEAACA83+/qVoxCAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgLDRXB3fA0GrgQAAADj/92vNAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAw9Uv8vKvUsPl/rzX8l8BAuRy9hO02iymFxAW6tZ3P38kWAUAU+/zPkeYhYwBHbo07fbW9ZgBXRJQOFafbeZrBOAl0Bu/3N5KkYaiwpEp1jx5vH1eUyQDAA=="
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/pages/index.tsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$styles$2f$styles$2e$module$2e$scss__$5b$client$5d$__$28$css__module$29$__ = __turbopack_context__.i("[project]/styles/styles.module.scss [client] (css module)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$header$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/header.tsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$modelsClotch$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/modelsClotch.tsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$logotypeForHead$2e$svg$2e$mjs__$7b$__IMAGE__$3d3e$__$225b$project$5d2f$assets$2f$logotypeForHead$2e$svg__$28$static__in__ecmascript$2c$__tag__client$2922$__$7d$__$5b$client$5d$__$28$structured__image__object__with__data__url$2c$__ecmascript$29$__ = __turbopack_context__.i('[project]/assets/logotypeForHead.svg.mjs { IMAGE => "[project]/assets/logotypeForHead.svg (static in ecmascript, tag client)" } [client] (structured image object with data url, ecmascript)');
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$head$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/head.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/image.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$menModel$2e$webp$2e$mjs__$7b$__IMAGE__$3d3e$__$225b$project$5d2f$assets$2f$menModel$2e$webp__$28$static__in__ecmascript$2c$__tag__client$2922$__$7d$__$5b$client$5d$__$28$structured__image__object__with__data__url$2c$__ecmascript$29$__ = __turbopack_context__.i('[project]/assets/menModel.webp.mjs { IMAGE => "[project]/assets/menModel.webp (static in ecmascript, tag client)" } [client] (structured image object with data url, ecmascript)');
var __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$winterTime$2f$menCollection$2f$WinterBlueMen$2e$webp$2e$mjs__$7b$__IMAGE__$3d3e$__$225b$project$5d2f$assets$2f$winterTime$2f$menCollection$2f$WinterBlueMen$2e$webp__$28$static__in__ecmascript$2c$__tag__client$2922$__$7d$__$5b$client$5d$__$28$structured__image__object__with__data__url$2c$__ecmascript$29$__ = __turbopack_context__.i('[project]/assets/winterTime/menCollection/WinterBlueMen.webp.mjs { IMAGE => "[project]/assets/winterTime/menCollection/WinterBlueMen.webp (static in ecmascript, tag client)" } [client] (structured image object with data url, ecmascript)');
var __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$winterTime$2f$menCollection$2f$WinterWhiteMen$2e$webp$2e$mjs__$7b$__IMAGE__$3d3e$__$225b$project$5d2f$assets$2f$winterTime$2f$menCollection$2f$WinterWhiteMen$2e$webp__$28$static__in__ecmascript$2c$__tag__client$2922$__$7d$__$5b$client$5d$__$28$structured__image__object__with__data__url$2c$__ecmascript$29$__ = __turbopack_context__.i('[project]/assets/winterTime/menCollection/WinterWhiteMen.webp.mjs { IMAGE => "[project]/assets/winterTime/menCollection/WinterWhiteMen.webp (static in ecmascript, tag client)" } [client] (structured image object with data url, ecmascript)');
var __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$winterTime$2f$menCollection$2f$WinterBrownMen$2e$webp$2e$mjs__$7b$__IMAGE__$3d3e$__$225b$project$5d2f$assets$2f$winterTime$2f$menCollection$2f$WinterBrownMen$2e$webp__$28$static__in__ecmascript$2c$__tag__client$2922$__$7d$__$5b$client$5d$__$28$structured__image__object__with__data__url$2c$__ecmascript$29$__ = __turbopack_context__.i('[project]/assets/winterTime/menCollection/WinterBrownMen.webp.mjs { IMAGE => "[project]/assets/winterTime/menCollection/WinterBrownMen.webp (static in ecmascript, tag client)" } [client] (structured image object with data url, ecmascript)');
var __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$winterTime$2f$menCollection$2f$WinterGreenMen$2e$webp$2e$mjs__$7b$__IMAGE__$3d3e$__$225b$project$5d2f$assets$2f$winterTime$2f$menCollection$2f$WinterGreenMen$2e$webp__$28$static__in__ecmascript$2c$__tag__client$2922$__$7d$__$5b$client$5d$__$28$structured__image__object__with__data__url$2c$__ecmascript$29$__ = __turbopack_context__.i('[project]/assets/winterTime/menCollection/WinterGreenMen.webp.mjs { IMAGE => "[project]/assets/winterTime/menCollection/WinterGreenMen.webp (static in ecmascript, tag client)" } [client] (structured image object with data url, ecmascript)');
var __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$winterTime$2f$womenCollection$2f$WinterBrownWomen$2e$webp$2e$mjs__$7b$__IMAGE__$3d3e$__$225b$project$5d2f$assets$2f$winterTime$2f$womenCollection$2f$WinterBrownWomen$2e$webp__$28$static__in__ecmascript$2c$__tag__client$2922$__$7d$__$5b$client$5d$__$28$structured__image__object__with__data__url$2c$__ecmascript$29$__ = __turbopack_context__.i('[project]/assets/winterTime/womenCollection/WinterBrownWomen.webp.mjs { IMAGE => "[project]/assets/winterTime/womenCollection/WinterBrownWomen.webp (static in ecmascript, tag client)" } [client] (structured image object with data url, ecmascript)');
var __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$winterTime$2f$womenCollection$2f$WinterBlueWomen$2e$webp$2e$mjs__$7b$__IMAGE__$3d3e$__$225b$project$5d2f$assets$2f$winterTime$2f$womenCollection$2f$WinterBlueWomen$2e$webp__$28$static__in__ecmascript$2c$__tag__client$2922$__$7d$__$5b$client$5d$__$28$structured__image__object__with__data__url$2c$__ecmascript$29$__ = __turbopack_context__.i('[project]/assets/winterTime/womenCollection/WinterBlueWomen.webp.mjs { IMAGE => "[project]/assets/winterTime/womenCollection/WinterBlueWomen.webp (static in ecmascript, tag client)" } [client] (structured image object with data url, ecmascript)');
var __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$winterTime$2f$womenCollection$2f$WinterGreenWomen$2e$webp$2e$mjs__$7b$__IMAGE__$3d3e$__$225b$project$5d2f$assets$2f$winterTime$2f$womenCollection$2f$WinterGreenWomen$2e$webp__$28$static__in__ecmascript$2c$__tag__client$2922$__$7d$__$5b$client$5d$__$28$structured__image__object__with__data__url$2c$__ecmascript$29$__ = __turbopack_context__.i('[project]/assets/winterTime/womenCollection/WinterGreenWomen.webp.mjs { IMAGE => "[project]/assets/winterTime/womenCollection/WinterGreenWomen.webp (static in ecmascript, tag client)" } [client] (structured image object with data url, ecmascript)');
var __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$winterTime$2f$womenCollection$2f$WinterWhiteWomen$2e$webp$2e$mjs__$7b$__IMAGE__$3d3e$__$225b$project$5d2f$assets$2f$winterTime$2f$womenCollection$2f$WinterWhiteWomen$2e$webp__$28$static__in__ecmascript$2c$__tag__client$2922$__$7d$__$5b$client$5d$__$28$structured__image__object__with__data__url$2c$__ecmascript$29$__ = __turbopack_context__.i('[project]/assets/winterTime/womenCollection/WinterWhiteWomen.webp.mjs { IMAGE => "[project]/assets/winterTime/womenCollection/WinterWhiteWomen.webp (static in ecmascript, tag client)" } [client] (structured image object with data url, ecmascript)');
var __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$summerTime$2f$menCollection$2f$SummerBlueMen$2e$webp$2e$mjs__$7b$__IMAGE__$3d3e$__$225b$project$5d2f$assets$2f$summerTime$2f$menCollection$2f$SummerBlueMen$2e$webp__$28$static__in__ecmascript$2c$__tag__client$2922$__$7d$__$5b$client$5d$__$28$structured__image__object__with__data__url$2c$__ecmascript$29$__ = __turbopack_context__.i('[project]/assets/summerTime/menCollection/SummerBlueMen.webp.mjs { IMAGE => "[project]/assets/summerTime/menCollection/SummerBlueMen.webp (static in ecmascript, tag client)" } [client] (structured image object with data url, ecmascript)');
var __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$summerTime$2f$menCollection$2f$SummerWhiteMen$2e$webp$2e$mjs__$7b$__IMAGE__$3d3e$__$225b$project$5d2f$assets$2f$summerTime$2f$menCollection$2f$SummerWhiteMen$2e$webp__$28$static__in__ecmascript$2c$__tag__client$2922$__$7d$__$5b$client$5d$__$28$structured__image__object__with__data__url$2c$__ecmascript$29$__ = __turbopack_context__.i('[project]/assets/summerTime/menCollection/SummerWhiteMen.webp.mjs { IMAGE => "[project]/assets/summerTime/menCollection/SummerWhiteMen.webp (static in ecmascript, tag client)" } [client] (structured image object with data url, ecmascript)');
var __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$summerTime$2f$menCollection$2f$SummerBrownMen$2e$webp$2e$mjs__$7b$__IMAGE__$3d3e$__$225b$project$5d2f$assets$2f$summerTime$2f$menCollection$2f$SummerBrownMen$2e$webp__$28$static__in__ecmascript$2c$__tag__client$2922$__$7d$__$5b$client$5d$__$28$structured__image__object__with__data__url$2c$__ecmascript$29$__ = __turbopack_context__.i('[project]/assets/summerTime/menCollection/SummerBrownMen.webp.mjs { IMAGE => "[project]/assets/summerTime/menCollection/SummerBrownMen.webp (static in ecmascript, tag client)" } [client] (structured image object with data url, ecmascript)');
var __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$summerTime$2f$menCollection$2f$SummerGreenMen$2e$webp$2e$mjs__$7b$__IMAGE__$3d3e$__$225b$project$5d2f$assets$2f$summerTime$2f$menCollection$2f$SummerGreenMen$2e$webp__$28$static__in__ecmascript$2c$__tag__client$2922$__$7d$__$5b$client$5d$__$28$structured__image__object__with__data__url$2c$__ecmascript$29$__ = __turbopack_context__.i('[project]/assets/summerTime/menCollection/SummerGreenMen.webp.mjs { IMAGE => "[project]/assets/summerTime/menCollection/SummerGreenMen.webp (static in ecmascript, tag client)" } [client] (structured image object with data url, ecmascript)');
var __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$summerTime$2f$womenCollection$2f$SummerBlueWomen$2e$webp$2e$mjs__$7b$__IMAGE__$3d3e$__$225b$project$5d2f$assets$2f$summerTime$2f$womenCollection$2f$SummerBlueWomen$2e$webp__$28$static__in__ecmascript$2c$__tag__client$2922$__$7d$__$5b$client$5d$__$28$structured__image__object__with__data__url$2c$__ecmascript$29$__ = __turbopack_context__.i('[project]/assets/summerTime/womenCollection/SummerBlueWomen.webp.mjs { IMAGE => "[project]/assets/summerTime/womenCollection/SummerBlueWomen.webp (static in ecmascript, tag client)" } [client] (structured image object with data url, ecmascript)');
var __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$summerTime$2f$womenCollection$2f$SummerWhiteWomen$2e$webp$2e$mjs__$7b$__IMAGE__$3d3e$__$225b$project$5d2f$assets$2f$summerTime$2f$womenCollection$2f$SummerWhiteWomen$2e$webp__$28$static__in__ecmascript$2c$__tag__client$2922$__$7d$__$5b$client$5d$__$28$structured__image__object__with__data__url$2c$__ecmascript$29$__ = __turbopack_context__.i('[project]/assets/summerTime/womenCollection/SummerWhiteWomen.webp.mjs { IMAGE => "[project]/assets/summerTime/womenCollection/SummerWhiteWomen.webp (static in ecmascript, tag client)" } [client] (structured image object with data url, ecmascript)');
var __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$summerTime$2f$womenCollection$2f$SummerBrownWomen$2e$webp$2e$mjs__$7b$__IMAGE__$3d3e$__$225b$project$5d2f$assets$2f$summerTime$2f$womenCollection$2f$SummerBrownWomen$2e$webp__$28$static__in__ecmascript$2c$__tag__client$2922$__$7d$__$5b$client$5d$__$28$structured__image__object__with__data__url$2c$__ecmascript$29$__ = __turbopack_context__.i('[project]/assets/summerTime/womenCollection/SummerBrownWomen.webp.mjs { IMAGE => "[project]/assets/summerTime/womenCollection/SummerBrownWomen.webp (static in ecmascript, tag client)" } [client] (structured image object with data url, ecmascript)');
var __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$summerTime$2f$womenCollection$2f$SummerGreenWomen$2e$webp$2e$mjs__$7b$__IMAGE__$3d3e$__$225b$project$5d2f$assets$2f$summerTime$2f$womenCollection$2f$SummerGreenWomen$2e$webp__$28$static__in__ecmascript$2c$__tag__client$2922$__$7d$__$5b$client$5d$__$28$structured__image__object__with__data__url$2c$__ecmascript$29$__ = __turbopack_context__.i('[project]/assets/summerTime/womenCollection/SummerGreenWomen.webp.mjs { IMAGE => "[project]/assets/summerTime/womenCollection/SummerGreenWomen.webp (static in ecmascript, tag client)" } [client] (structured image object with data url, ecmascript)');
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
const Index = ()=>{
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$head$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("meta", {
                        name: "viewport",
                        content: "width=device-width"
                    }, void 0, false, {
                        fileName: "[project]/pages/index.tsx",
                        lineNumber: 30,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("link", {
                        rel: "icon",
                        href: __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$logotypeForHead$2e$svg$2e$mjs__$7b$__IMAGE__$3d3e$__$225b$project$5d2f$assets$2f$logotypeForHead$2e$svg__$28$static__in__ecmascript$2c$__tag__client$2922$__$7d$__$5b$client$5d$__$28$structured__image__object__with__data__url$2c$__ecmascript$29$__["default"].src,
                        type: "image/x-icon"
                    }, void 0, false, {
                        fileName: "[project]/pages/index.tsx",
                        lineNumber: 31,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("title", {
                        children: "Meraviglioso"
                    }, void 0, false, {
                        fileName: "[project]/pages/index.tsx",
                        lineNumber: 32,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/pages/index.tsx",
                lineNumber: 29,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$header$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["HeaderComponent"], {}, void 0, false, {
                                fileName: "[project]/pages/index.tsx",
                                lineNumber: 36,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$styles$2f$styles$2e$module$2e$scss__$5b$client$5d$__$28$css__module$29$__["default"].rootInfoPage,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                        className: __TURBOPACK__imported__module__$5b$project$5d2f$styles$2f$styles$2e$module$2e$scss__$5b$client$5d$__$28$css__module$29$__["default"].title,
                                        children: "Meraviglioso"
                                    }, void 0, false, {
                                        fileName: "[project]/pages/index.tsx",
                                        lineNumber: 38,
                                        columnNumber: 13
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: __TURBOPACK__imported__module__$5b$project$5d2f$styles$2f$styles$2e$module$2e$scss__$5b$client$5d$__$28$css__module$29$__["default"].subtitle,
                                        children: "La vostra magnificenza, incarnata nello stile"
                                    }, void 0, false, {
                                        fileName: "[project]/pages/index.tsx",
                                        lineNumber: 39,
                                        columnNumber: 13
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                                        src: __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$menModel$2e$webp$2e$mjs__$7b$__IMAGE__$3d3e$__$225b$project$5d2f$assets$2f$menModel$2e$webp__$28$static__in__ecmascript$2c$__tag__client$2922$__$7d$__$5b$client$5d$__$28$structured__image__object__with__data__url$2c$__ecmascript$29$__["default"]
                                    }, void 0, false, {
                                        fileName: "[project]/pages/index.tsx",
                                        lineNumber: 42,
                                        columnNumber: 13
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                                        src: __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$menModel$2e$webp$2e$mjs__$7b$__IMAGE__$3d3e$__$225b$project$5d2f$assets$2f$menModel$2e$webp__$28$static__in__ecmascript$2c$__tag__client$2922$__$7d$__$5b$client$5d$__$28$structured__image__object__with__data__url$2c$__ecmascript$29$__["default"]
                                    }, void 0, false, {
                                        fileName: "[project]/pages/index.tsx",
                                        lineNumber: 43,
                                        columnNumber: 13
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/pages/index.tsx",
                                lineNumber: 37,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/pages/index.tsx",
                        lineNumber: 35,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$modelsClotch$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["ModelsСlotch"], {
                                titleSection: "Winter clotch for men",
                                imageOne: __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$winterTime$2f$menCollection$2f$WinterBrownMen$2e$webp$2e$mjs__$7b$__IMAGE__$3d3e$__$225b$project$5d2f$assets$2f$winterTime$2f$menCollection$2f$WinterBrownMen$2e$webp__$28$static__in__ecmascript$2c$__tag__client$2922$__$7d$__$5b$client$5d$__$28$structured__image__object__with__data__url$2c$__ecmascript$29$__["default"],
                                imageTwo: __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$winterTime$2f$menCollection$2f$WinterBlueMen$2e$webp$2e$mjs__$7b$__IMAGE__$3d3e$__$225b$project$5d2f$assets$2f$winterTime$2f$menCollection$2f$WinterBlueMen$2e$webp__$28$static__in__ecmascript$2c$__tag__client$2922$__$7d$__$5b$client$5d$__$28$structured__image__object__with__data__url$2c$__ecmascript$29$__["default"],
                                imageThree: __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$winterTime$2f$menCollection$2f$WinterGreenMen$2e$webp$2e$mjs__$7b$__IMAGE__$3d3e$__$225b$project$5d2f$assets$2f$winterTime$2f$menCollection$2f$WinterGreenMen$2e$webp__$28$static__in__ecmascript$2c$__tag__client$2922$__$7d$__$5b$client$5d$__$28$structured__image__object__with__data__url$2c$__ecmascript$29$__["default"],
                                imageFour: __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$winterTime$2f$menCollection$2f$WinterWhiteMen$2e$webp$2e$mjs__$7b$__IMAGE__$3d3e$__$225b$project$5d2f$assets$2f$winterTime$2f$menCollection$2f$WinterWhiteMen$2e$webp__$28$static__in__ecmascript$2c$__tag__client$2922$__$7d$__$5b$client$5d$__$28$structured__image__object__with__data__url$2c$__ecmascript$29$__["default"],
                                subtitle: "Model number One"
                            }, void 0, false, {
                                fileName: "[project]/pages/index.tsx",
                                lineNumber: 47,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$modelsClotch$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["ModelsСlotch"], {
                                titleSection: "Winter clotch for woomen",
                                imageOne: __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$winterTime$2f$womenCollection$2f$WinterBrownWomen$2e$webp$2e$mjs__$7b$__IMAGE__$3d3e$__$225b$project$5d2f$assets$2f$winterTime$2f$womenCollection$2f$WinterBrownWomen$2e$webp__$28$static__in__ecmascript$2c$__tag__client$2922$__$7d$__$5b$client$5d$__$28$structured__image__object__with__data__url$2c$__ecmascript$29$__["default"],
                                imageTwo: __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$winterTime$2f$womenCollection$2f$WinterBlueWomen$2e$webp$2e$mjs__$7b$__IMAGE__$3d3e$__$225b$project$5d2f$assets$2f$winterTime$2f$womenCollection$2f$WinterBlueWomen$2e$webp__$28$static__in__ecmascript$2c$__tag__client$2922$__$7d$__$5b$client$5d$__$28$structured__image__object__with__data__url$2c$__ecmascript$29$__["default"],
                                imageThree: __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$winterTime$2f$womenCollection$2f$WinterGreenWomen$2e$webp$2e$mjs__$7b$__IMAGE__$3d3e$__$225b$project$5d2f$assets$2f$winterTime$2f$womenCollection$2f$WinterGreenWomen$2e$webp__$28$static__in__ecmascript$2c$__tag__client$2922$__$7d$__$5b$client$5d$__$28$structured__image__object__with__data__url$2c$__ecmascript$29$__["default"],
                                imageFour: __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$winterTime$2f$womenCollection$2f$WinterWhiteWomen$2e$webp$2e$mjs__$7b$__IMAGE__$3d3e$__$225b$project$5d2f$assets$2f$winterTime$2f$womenCollection$2f$WinterWhiteWomen$2e$webp__$28$static__in__ecmascript$2c$__tag__client$2922$__$7d$__$5b$client$5d$__$28$structured__image__object__with__data__url$2c$__ecmascript$29$__["default"],
                                subtitle: "Model number One"
                            }, void 0, false, {
                                fileName: "[project]/pages/index.tsx",
                                lineNumber: 56,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$modelsClotch$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["ModelsСlotch"], {
                                titleSection: "Summer clotch for men",
                                imageOne: __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$summerTime$2f$menCollection$2f$SummerBrownMen$2e$webp$2e$mjs__$7b$__IMAGE__$3d3e$__$225b$project$5d2f$assets$2f$summerTime$2f$menCollection$2f$SummerBrownMen$2e$webp__$28$static__in__ecmascript$2c$__tag__client$2922$__$7d$__$5b$client$5d$__$28$structured__image__object__with__data__url$2c$__ecmascript$29$__["default"],
                                imageTwo: __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$summerTime$2f$menCollection$2f$SummerBlueMen$2e$webp$2e$mjs__$7b$__IMAGE__$3d3e$__$225b$project$5d2f$assets$2f$summerTime$2f$menCollection$2f$SummerBlueMen$2e$webp__$28$static__in__ecmascript$2c$__tag__client$2922$__$7d$__$5b$client$5d$__$28$structured__image__object__with__data__url$2c$__ecmascript$29$__["default"],
                                imageThree: __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$summerTime$2f$menCollection$2f$SummerGreenMen$2e$webp$2e$mjs__$7b$__IMAGE__$3d3e$__$225b$project$5d2f$assets$2f$summerTime$2f$menCollection$2f$SummerGreenMen$2e$webp__$28$static__in__ecmascript$2c$__tag__client$2922$__$7d$__$5b$client$5d$__$28$structured__image__object__with__data__url$2c$__ecmascript$29$__["default"],
                                imageFour: __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$summerTime$2f$menCollection$2f$SummerWhiteMen$2e$webp$2e$mjs__$7b$__IMAGE__$3d3e$__$225b$project$5d2f$assets$2f$summerTime$2f$menCollection$2f$SummerWhiteMen$2e$webp__$28$static__in__ecmascript$2c$__tag__client$2922$__$7d$__$5b$client$5d$__$28$structured__image__object__with__data__url$2c$__ecmascript$29$__["default"],
                                subtitle: "Model number One"
                            }, void 0, false, {
                                fileName: "[project]/pages/index.tsx",
                                lineNumber: 65,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$modelsClotch$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["ModelsСlotch"], {
                                titleSection: "Summer clotch for woomen",
                                imageOne: __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$summerTime$2f$womenCollection$2f$SummerBrownWomen$2e$webp$2e$mjs__$7b$__IMAGE__$3d3e$__$225b$project$5d2f$assets$2f$summerTime$2f$womenCollection$2f$SummerBrownWomen$2e$webp__$28$static__in__ecmascript$2c$__tag__client$2922$__$7d$__$5b$client$5d$__$28$structured__image__object__with__data__url$2c$__ecmascript$29$__["default"],
                                imageTwo: __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$summerTime$2f$womenCollection$2f$SummerBlueWomen$2e$webp$2e$mjs__$7b$__IMAGE__$3d3e$__$225b$project$5d2f$assets$2f$summerTime$2f$womenCollection$2f$SummerBlueWomen$2e$webp__$28$static__in__ecmascript$2c$__tag__client$2922$__$7d$__$5b$client$5d$__$28$structured__image__object__with__data__url$2c$__ecmascript$29$__["default"],
                                imageThree: __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$summerTime$2f$womenCollection$2f$SummerGreenWomen$2e$webp$2e$mjs__$7b$__IMAGE__$3d3e$__$225b$project$5d2f$assets$2f$summerTime$2f$womenCollection$2f$SummerGreenWomen$2e$webp__$28$static__in__ecmascript$2c$__tag__client$2922$__$7d$__$5b$client$5d$__$28$structured__image__object__with__data__url$2c$__ecmascript$29$__["default"],
                                imageFour: __TURBOPACK__imported__module__$5b$project$5d2f$assets$2f$summerTime$2f$womenCollection$2f$SummerWhiteWomen$2e$webp$2e$mjs__$7b$__IMAGE__$3d3e$__$225b$project$5d2f$assets$2f$summerTime$2f$womenCollection$2f$SummerWhiteWomen$2e$webp__$28$static__in__ecmascript$2c$__tag__client$2922$__$7d$__$5b$client$5d$__$28$structured__image__object__with__data__url$2c$__ecmascript$29$__["default"],
                                subtitle: "Model number One"
                            }, void 0, false, {
                                fileName: "[project]/pages/index.tsx",
                                lineNumber: 74,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/pages/index.tsx",
                        lineNumber: 46,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/pages/index.tsx",
                lineNumber: 34,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true);
};
_c = Index;
const __TURBOPACK__default__export__ = Index;
var _c;
__turbopack_context__.k.register(_c, "Index");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[next]/entry/page-loader.ts { PAGE => \"[project]/pages/index.tsx [client] (ecmascript)\" } [client] (ecmascript)", ((__turbopack_context__, module, exports) => {

const PAGE_PATH = "/";
(window.__NEXT_P = window.__NEXT_P || []).push([
    PAGE_PATH,
    ()=>{
        return __turbopack_context__.r("[project]/pages/index.tsx [client] (ecmascript)");
    }
]);
// @ts-expect-error module.hot exists
if (module.hot) {
    // @ts-expect-error module.hot exists
    module.hot.dispose(function() {
        window.__NEXT_P.push([
            PAGE_PATH
        ]);
    });
}
}),
"[hmr-entry]/hmr-entry.js { ENTRY => \"[project]/pages/index\" }", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.r("[next]/entry/page-loader.ts { PAGE => \"[project]/pages/index.tsx [client] (ecmascript)\" } [client] (ecmascript)");
}),
]);

//# sourceMappingURL=%5Broot-of-the-server%5D__a43930cf._.js.map