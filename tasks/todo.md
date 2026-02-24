# MDPad 鐎殿喒鍋撻柛娆愬灣閹广垽宕濋檱缁愶繝鐓搴ｇ2026-02-23闁?

## 閻犱讲鈧啿鐏婇柨娑樼墕閻ゅ嫰寮挊澶婎枀闁?
- [x] 閻庣懓顦抽ˉ濠囩嵁閼哥數澧″Δ?Windows 闁告鍠撻弫鎾寸瑹濠靛﹦顩柨娑樻梗SVC/SDK闁靛棔闃渦st闁靛棔绠榚bView2闁?
- [x] 閻犵儤鍨块埀?`pnpm tauri:dev`
- [x] 閻犵儤鍨块埀?`pnpm tauri:build` 妤犵偞婀规鍥礄閸濆嫮鏆旈悷浣告噹鐎?
- [x] 閻庣懓鏈崹姘跺棘閸ワ附顐介柛蹇撶枃娴犲牊绋夋惔鈥崇閻庡湱鍋樼欢銉╂儍閸曨喖娈伴柛鏂诲妼鐎靛弶顨ュ畝鍐
- [x] 閺夆晜绋栭、鎴﹀礈瀹ュ浂浼傞柛鎺戞鐎垫ɑ瀵煎Ο鍝勵嚙闁挎稑鐗撳閿嬫媴鎼粹€崇闁告牕鎳嶇紞瀣矓椤栨碍鍟為悹鈧敂鑲╃
- [x] 濞ｅ浂鍠栭ˇ鏌ュ礂閹惰姤锛旈柟绋款樀閹告娊寮悩宕囥€婇梺顐熷亾闁告垶妞藉Λ鑸碉紣?
- [x] 閻炴稏鍎遍崢?Windows 闁归潧顑呮导鎰殽鐏炵偓鏆繛鎾虫噹瀹曠喐绋夋惔銊у矗閻犲洣娴囬鍥亹?

## 閺夆晜绋戠€瑰磭鎷嬮弶璺ㄧЭ
1. 闁绘粠鍨伴。銊ヮ啅閹绘帞鏆氶柟瀛樺姧缁?
   - Build Tools: 鐎瑰憡褰冮悾銊ф啑閸涱叀瀚欓柛娆樺灥椤?`vswhere` 婵☆偀鍋撻柛?
   - Rust: `rustc 1.93.1`闁挎稑鐣璫argo 1.93.1`
   - WebView2: 鐎圭寮堕ˉ鍛圭€ｎ喒鍋撳宕囩畺
2. 闁哄瀚紓鎾寸▔鎼淬倗绠ラ悶娑樿嫰閸戯紕鈧懓鏈崹姘舵晬?
   - `pnpm lint` 闂侇偅淇虹换?
   - `pnpm test` 闂侇偅淇虹换鍐晬?/5闁?
   - `pnpm build` 闂侇偅淇虹换?
   - `pnpm tauri:build` 闂侇偅淇虹换?
3. 閻庣懓顦抽ˉ濠囧礌閸涱剟鐛撻柣妞绘櫔缁?
   - `src-tauri/target/release/bundle/nsis/MDPad_0.1.0_x64-setup.exe`
4. 闁告梻鍠曢崗妯活殽瀹€鍐闁?
   - 闁哄倸娲ｅ▎銏ゅ礂鐎圭姳绮撴繛澶堝妼閸炰粙骞嬮幇顒€顫犻柨娑樻綁.md` / `.markdown`闁?
   - 闁稿繐鐤囨禒鍫ュ川閹存帗濮㈤柟绋挎搐閹粌顔忛幓鎺旀殧閻熶礁鎳愬▓?`mdpad.exe`
   - 闁告娲栭悿鍕瑹鐎ｎ厾绠荤紒瀣儔閻涙瑧鎷犳笟鈧埀顒佷亢缁诲啴鏁嶉崼銉禃婵?濞存粌鏈濂稿箥閹惧磭纾婚柛褍娲ｇ拹?1 濞戞搩浜ｇ换妯肩矙鐎ｅ墎绀?
5. 濞村吋锚鐎靛弶绋夋惔婵囧弿濠㈣泛绋勭槐?
   - 鐎瑰憡褰冮悾顒勫箣閹邦喚妞介弶鍫熷灥濞呮帡骞婇幒鎴濐潱閺?+ manualChunks 闁告帒妫楃€?
   - 鐎规瓕寮撻幈銊﹀緞瀹ュ懎褰犻梻鍌ゅ幗鐎垫粓鏌﹂鈧埀顑藉亾闁告垶妞藉Λ鑸碉紣濮楀牏绀刞close()` -> `destroy()`闁?
   - 鐎规瓕寮撻幈銊﹀緞瀹ュ懏绀堥柡鍌氭处濠€鎵焊閻愵剙搴婇悶娑樿嫰椤曢亶鎳涚€靛憡鐣?dirty 閻犲浂鍨伴崹?
   - 鐎规瓕寮撻幈銊﹀緞?ACL 缂傚倸鎼妵鎴犫偓浣冨閸ぱ囨儍?`plugin:window|close not allowed`闁挎稑鐗愯棢濮?close/destroy 闁哄鍟村娲晬?

## 缂備焦鎸婚悘澶愬炊閻愭亽鈧?
- 闁告鍟块埀顒佺矊瀹?JS 闁?>700KB闁炽儲绻傞崙锟犲箯閸℃鐎诲☉鎾跺皑缁?
  - `editor-core` ~355KB
  - `vendor` ~243KB
  - `ui-core` ~116KB
- 闁烩晩鍠栨晶鐘诲礈閳衡偓缂嶆垿鎯冮崟顒佇?GUI 闁归潧顑呮导鎰兜椤旀鍚囧銈囨缁辨瑩妫侀埀顒佺閸濆嫪绱ｉ悷娆忓€搁惂鍌炴偩瀹€鍕〃閻炴稑濂旂拹鐔兼晬婢舵稓绐?
  - 闁告瑥鑻崵顔剧箔椤戣法鐧屽☉鎿冧簼閺嬪啯绂掗懜鍨槯闁告劕鎳庨鎰板及椤栨碍鍎婃慨婵撶悼閳ユ﹢宕氶崶銊ュ簥
  - 闁归攱鐗楃€氬潡骞嶉幘宕囩；濞达絾鎹囬悰?
  - dirty 鐎殿喖婀遍悰銉︾閵堝嫮闉嶇紓浣告婵☆參鏁嶉崷鐜渧e/Don't Save/Cancel闁?

## 闁烩晝顭堥崣褔寮崶銊ｂ偓?
- 闁归潧顑呮导鎰殽鐏炵偓鏆繛鎾虫噹瀹曠喖鏁嶅姝瀘cs/qa/windows-manual-checklist.md`
- 闁煎浜滄慨鈺呭礌?閺夊牆鎳庢慨顏咁殽瀹€鍐閻犱焦婢樼紞宥夋晬濮濇瓰ocs/qa/windows-verification-results.md`

## 2026-02-23 No-titlebar UI Redesign (Wrap-up)
- [x] Rechecked frameless window config and custom titlebar implementation.
- [x] Verified ACL permissions for `startDragging/minimize/toggleMaximize/close/destroy`.
- [x] Ran `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm tauri:build` (all passed).
- [x] Produced installer: `src-tauri/target/release/bundle/nsis/MDPad_0.1.0_x64-setup.exe`.
- Note: Tauri warns `identifier` ends with `.app`; adjust later if needed.

## 2026-02-23 File-Association Console Window Fix
- [x] Root cause confirmed: Windows subsystem not set to GUI in `src-tauri/src/main.rs`.
- [x] Added `#![cfg_attr(all(not(debug_assertions), target_os = "windows"), windows_subsystem = "windows")]`.
- [x] Rebuilt installer with `pnpm tauri:build`.
- [ ] Manual validation pending: double-click `.md` from Explorer should open app without console window.

## 2026-02-23 Minimal Single-Page UI
- [x] Removed brand/logo/path from titlebar.
- [x] Refactored titlebar into icon-only actions on the left (open/save/save-as/theme) with hover tooltip.
- [x] Centered document title in titlebar; unsaved status switched to subtle `闁炽儺鏅?
- [x] Kept right-side window controls (minimize/maximize/close) and drag/double-click maximize behavior.
- [x] Unified titlebar/editor width and radius; editor overlaps titlebar bottom for seamless single-page feel.
- [x] Removed decorative gradients/shadows; window and editor now share the same flat background style.
- [x] Validation passed: `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm tauri:build`.

## 2026-02-24 Transparent Outer Window + Shadowed Surfaces
- [x] Pre-check completed: titlebar structure confirmed as left icons / center filename / right window controls.
- [x] Enabled transparent Tauri window (`transparent: true`) while keeping frameless config.
- [x] Applied +20 total outer size rule via 10px transparent margin on all four sides.
- [x] Added medium shadows to titlebar and editor surface.
- [x] Enforced right-aligned window controls in CSS (`win-controls` at grid right edge).
- [x] Validation passed: `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm tauri:build`.

## 2026-02-24 GitHub Release v0.1.0
- [x] Created first GitHub release: `v0.1.0` (private repo).
- [x] Uploaded installer asset: `MDPad_0.1.0_x64-setup.exe`.
- [x] Verified release URL and asset availability.
- Release: https://github.com/endearqb/MDPad/releases/tag/v0.1.0

## 2026-02-24 Markdown 婵炴挸寮堕悡瀣嚄閽樺顫旈柟纰樻櫅閻秵绋夋惔鈩冨殥濞寸姰鍊涜ぐ宥夊础閺囨碍鍙忓璺虹▌缁辨瑧鈧湱鍋為弻锔炬媼閳ュ啿鐏婇柨?
- [x] 閻庨潧缍婄紞鍫ュ棘鐟欏嫷鏀虫鐐插閳ユ鎷嬮妶鍛Ъ闁告挸绉撮悿鍕偝閹殿喖绻侀柛娆欑秶缁辨獔ditor闁靛棔鎭璷dec闁靛棔澶焞ash闁靛棔宸ヽons闁?
- [x] 闁哄倹婢橀·?TipTap 闁圭鏅涢惈宥夋晬濮濆硽skList/TaskItem闁靛棔绠慳ble闁靛棔鐢玜TeX闁靛棔绀佽ぐ鑼磽閳哄倹鏉归柛銉ュ⒔婢ф牗绋夋惔銈庢綊濡増鍨埀顑跨窔閻撹埖锛?
- [x] 闂佹彃绉甸悗?Slash 闁告稒鍨濋幎銈夋嚕濠婂啫绀嬮悷娆欑畱瑜板倿鏌ч幑鎰唴妤犵偞婀归幈銊﹀緞?`/` 闁哄啰濮甸弲銉╂⒒椤曗偓椤?
- [x] 闁告娲ㄦ?Markdown 缂傚倹鐗炶闁活喕绶ょ槐鐧嶧M闁挎稑婢卆sklist/table闁? KaTeX + 濠殿垱甯婄紞?HTML 濞ｅ洦绻勫﹢?
- [x] 闁哄洤鐡ㄩ弻濠囧冀瀹勬壆纭€闁挎稒鐭幑銏ゅ礉閳ュ啿鐏欓悶娑栧妸閳ь兛娴囬妴鍐冀缁楄　鍋撴担绋垮絾鐎殿喖绻堥埀顑跨閻涚喐鎷呴幘鍓佺礆闁衡偓閸欍儲鍞夊ù?
- [x] 闁哄洦瀵у畷鏌ュ箥閹惧啿鐦堕柛銉у亾閻栵絾绋夌悰鈾€鍋撳鍕€俊?+ 闁告锕埀顒€绻戝Σ鎴﹀捶閸℃凹娼￠悗鍦嚀濞呮帡鍨惧┑瀣垫闁?
- [x] 閺夆晜鍔橀、鎴烆殽瀹€鍐闁挎稒鐡猵npm lint`闁靛棔姊梡npm test`闁靛棔姊梡npm build`
- [x] 閺夆晜鍔橀、?Tauri 闁瑰灚鎸哥€垫ɑ顨ュ畝鍐闁挎稒鐡猵npm tauri:build`

## 2026-02-24 闁哄牜鍓濋悿鍡欑磼閹惧浜柛銉у仱閵?
- 闁哄秶鎳撳ú婊呪偓瑙勭煯缂嶅懘鏁?
  - `/` 闁告稒鍨濋幎銈夋嚕濠婂啫绀嬮柡鍐У閺呫儵鎯冮崟顏勭槣閻熸洑绀佺敮顐﹀炊閻樿櫕笑缂傚倹鐗炵欢顐﹀闯閵婏附寮撴繛澶堝妼閸?`@tiptap/extension-floating-menu` / `@tiptap/extension-bubble-menu` 闁圭鏅涢惈宥夋晬鐏炶偐鐭屾繛鎾冲级閻撳绂?React 闁兼寧绮屽畷鐔虹磼閸曨亝顐介柕?
- 闁衡偓閻熸澘袟闁硅姤顭堥々锕傛晬?
  - 缂傚倹鐗炵欢顐﹀闯閵婏箑鈷栭悘鐐存礃閺屽﹥鏅?TaskList/TaskItem闁靛棔绠慳ble闁靛棔娴畁line/Block Math闁挎稑婀燼TeX闁挎稑顦埀顑跨瑜拌尙绱撻埡鍌涙澒 Image/Video闁靛棔绔竨dio闁?
  - Slash 闁兼寧绮屽畷鐔煎棘閺夋鏉?ToDo闁靛棔绠慳ble闁靛棔搴渆dia闁靛棔搴渁th 闁告稒鍨濋幎銈嗐亜閻у摜绀夊ǎ鍥ㄧ箘閺嗏偓闁炽儲绮庨埞鏍偘?`/` + Ctrl+/闁炽儲绻嗚闁告瑦鍨埀?
  - Markdown 缂傚倹鐗炶闁活喕绀佸畷宀€鐥鐠?GFM + 闁煎浜滈悾鐐▕婢跺寒娼愰柛鎺撶懕缁辨繈寮ㄩ娑樼槷 tasklist/table/math/media 濞存粍甯熷ù鍡涘Υ?
  - 闁搞儳鍋撻悥锝呪攦閹邦厽鐓€濠?`src-tauri/icons/app-icon.svg`闁挎稑鑻懟鐔兼焻濮樺磭绠?`tauri icon` 闂佹彃绉寸紓鎾诲礂閵娿儺娈伴柟鍨尭鐎垫﹢宕堕悙顒傚灱闁?
- 濡ょ姴鐭侀惁澶岀磼閹惧浜柨?
  - `pnpm lint` 闂侇偅淇虹换鍐Υ?
  - `pnpm test` 闂侇偅淇虹换鍐晬?0/10闁挎稑顦埀?
  - `pnpm build` 闂侇偅淇虹换鍐Υ?
  - `pnpm tauri:build` 闂侇偅淇虹换鍐晬鐏炵晫鏆旈悷浣告噹鐎垫ɑ绂嶈婢у潡鏁?
    - `src-tauri/target/release/bundle/nsis/MDPad_0.1.0_x64-setup.exe`
- 濡炲閰ｅ▍鎾寸▔鎼粹剝鍊电紓渚囧弿缁?
  - KaTeX 鐎殿喗娲栭崣鍡樼閸℃氨绐涘鑸佃壘閻⊙勬媴閹惧湱銈繝褎鍔х槐婵嬪礌閸涱剛绉煎褏鍋涢妵鍥及鎼淬垺鈻旈柨娑欑☉椤┭囨閳ь剚娼诲☉妤冾伇婵縿鍎辩敮鍥╃磽閳轰礁璁查柛姘捣閻㈠骞愭径鎰粯閻熶椒绀佹竟鈧悗娑欍仦缂嶅骞嬮弽褎顐介弶鈺冨枎婵偞娼挊澶婂絾鐎殿喖绻戦悧鍗烆嚕韫囧鍋?

## 2026-02-24 缂傚倹鐗炵欢顐﹀闯閵娿儲顐介弶鈺冨枎瑜版煡鎮介妸銈嗗弿濠?+ 闁告瑥鑻崵顕€寮介崶顒夋毌闁哄秴绻橀崳鎼佸川閽樺鍊?
- [x] 濠㈣泛绉堕獮鍥嵁鐠鸿櫣鏆板ù锝呯М閳ь剚绮庣槐顏呮綇閹达附浠橀悷鏇氳兌閻℃垵顕ラ崨顓熷€甸柟闈涚Т瑜版煡鎮介妸鈶╁亾濠靛锛栧Λ鐗埳戦悧鎾炊?
- [x] 闁规儼妫勮ぐ鍥╃磼閻斿墎顏?`normalizeMarkdown` 鐎规悶鍎遍崣鍧楃嵁鐠虹儤韬?reducer/editor 閻庨潧缍婄紞鍫熸媴鐠恒劍鏆?
- [x] 濞ｅ浂鍠栭ˇ鑼磽閺嶎剛甯嗛柛锝冨妼閹挸顫㈤妷銉︾闁诲繐鏈顖涚鐠佸湱绀勯梺顒€鐏濋崢?CRLF/LF 濞戞挸楠搁悢顒勫箲閵忥綆鏀介悗浣冨閸ぱ呮嫚椤栨粳鏇㈠矗?`setContent`闁?
- [x] 缂佸鍟块悾?`onStatsChange` 闁搞儳鍋犻惃鐔兼晬瀹€鍕€栧ù锝呭濡倝寮?effect 闂佹彃绉风粣?
- [x] 闁哄倹婢橀·鍐触鎼达綆浼傞柛娑欏灊閹?`rename_file`闁挎稑鐗忛ˉ鍡涙儎濡吋鍩傞悗鍦仱閸ｆ悂宕ㄩ挊澶嬪€抽柨娑樺缁绘岸鎮惧▎鎰挅閻忕偞娲栭幃鏇㈡晬?
- [x] 闁哄倹婢橀·鍐礈瀹ュ浂浼?`renameFile` service闁挎稑鑻懟鐔煎箳閵夈儱寮?App 濞戞挻鑹炬慨鐔访?
- [x] 閻庡湱鍋熼獮鍥冀閸ヮ剦鏆柡宥呯箲閺嬪啯绂掔捄鐑樺€抽柛娆忚嫰閸ゎ噣鏌屽鍛殥闁告艾绋勭槐娆愮閸涱垳妞介弶?basename闁挎稑鐡杗ter/Blur 闁圭粯鍔掑锕傛晬鐎涘炒c 闁告瑦鐗楃粔鐑芥晬?
- [x] 閻炴稏鍎遍崢?reducer 婵炴潙顑堥惁顖炴晬濮濇ename_path` 濞戞挸姘﹂、鎴犱焊?闁瑰箍鍨奸、鎴濐啅椤旇偐纾界憸鐗堝笂缁旀挳宕?
- [x] 閺夆晜鍔橀、鎴烆殽瀹€鍐闁挎稒鐡猵npm lint`闁靛棔姊梡npm test`闁靛棔姊梡npm build`闁靛棔姊梡npm tauri:build`

## 2026-02-24 闁哄牜鍓濋悿鍡欑磼閹惧浜柛銉у仱閵嗘劙鏁嶉崼銏㈡そ閺夊牊鍨佃ぐ鏌ユ偨閵婏腹鍋撹缁楀矂鏌屽鍛殥闁告艾绋勭槐?
- 闁哄秶鎳撳ú婊呪偓瑙勭煯缂嶅懘鏁?
  - 缂傚倹鐗炵欢顐﹀闯?`setContent` 闁告艾鏈鐐哄级閳ュ弶顐介柣鈺佺摠鐢潙袙閺冨洨绐涢柛妯煎枎椤?markdown 閻庢稒顨堥浣圭▔鐠囇呯闁哄牜浜炵划鐑樼▔閳?CRLF/LF 濞戞挸瀛╁﹢顖滀焊閻愵剙搴婇悶娑樼焿缁辨繄鈧絻澹堥崵褔宕氬┑鍡╂綏闁告牗鐗犲Ο浣糕枔闂堟稑鍐€濠㈣泛绉村ú鏍倶鐏炶棄鏁堕悗鐟扮畭閳?
- 闁稿繑濞婇弫顓㈠绩閻熸澘袟闁?
  - 闁哄倹婢橀·?`src/shared/utils/markdown.ts#normalizeMarkdown` 妤犵偠娉涘﹢?reducer/editor 闁稿繗浜弫銈夊Υ?
  - 闁哄倹婢橀·?`rename_file` Tauri 闁告稒鍨濋幎銈嗙▔鎼粹€愁枀缂?`renameFile` 閻犲鍟伴弫銈夋煣娣囨墎鍋?
  - TopBar 闁衡偓椤栨稑鐦柛娆忚嫰閸ゎ噣寮崶锔筋偨闁告艾绉风换姗€宕楅妷鈺佹闁告稖妫勯幃鏇熸綇閹惧啿寮抽柨娑樺缁酣宕楁担绛嬪晠闁衡偓?basename闁挎稑鐗婃晶璺ㄤ沪閺囩偞鍊抽梻鍛姌濡本绋夐弬鍓х闁伙絾鐟辩槐姘跺Υ?
- 濡ょ姴鐭侀惁澶岀磼閹惧浜柨?
  - `pnpm lint` 闂侇偅淇虹换鍐Υ?
  - `pnpm test` 闂侇偅淇虹换鍐晬?2/12闁挎稑顦埀?
  - `pnpm build` 闂侇偅淇虹换鍐Υ?
  - `pnpm tauri:build` 闂侇偅淇虹换鍐晬鐏炵晫鏆旈悷浣告噹鐎垫ɑ绂嶈婢у潡鏁?
    - `src-tauri/target/release/bundle/nsis/MDPad_0.1.0_x64-setup.exe`

## 2026-02-24 濞寸媴绲块悥婊堝锤濡ゅ嫷鍤旀繛澶嬫礋閻濐喗绂嶉鍡欑VSCode Solarized Light闁?
- [x] 閻熸瑥瀚崹婵嬬嵁閸撲讲鈧鎷嬮妶鍡楀闁稿繈鍎抽崑锝夋晬閸︾湈pTap CodeBlockLowlight + 闁哄秴鍢茬槐锟犲及閻樿尙娈搁柨?
- [x] 闁革负鍔庣槐顏呮綇閹存繃鐝ゅ☉鎿冨幖閹酣鎮?lowlight 閻犲浂鍘界涵鑸殿殗濡懓鐦ㄦ鐐跺煐濞存盯骞?StarterKit 濮掓稒顭堥?codeBlock
- [x] 濠⒀呭仜婵?Solarized Light token 濡増绮忔竟濠囧冀瀹勬壆纭€闁挎稑鐗嗛幆鍫ユ嚊椤忓嫬袟閻犲洤妫楅崺?閻犲浂鍙€閳诲牏鐚剧紒妯绘殰闁归晲绶ょ槐?
- [x] 閺夆晜鍔橀、鎴烆殽瀹€鍐闁挎稒鐡猵npm lint`闁靛棔姊梡npm test`闁靛棔姊梡npm build`

## 2026-02-24 闁哄牜鍓濋悿鍡欑磼閹惧浜柛銉у仱閵嗘劙鏁嶉崼婊冩暕闁活喕绀佸锛勬嫚椤撶喓銆婂Δ鍌浢肩€垫帡鏁?
- 闁稿繑濞婇弫顓㈠绩閻熸澘袟闁?
  - 缂傚倹鐗炵欢顐﹀闯閵娿儲鍎欓柣?`@tiptap/extension-code-block-lowlight`闁挎稑鑻懟鐔兼焻濮樺磭绠?`createLowlight(common)` 闁规亽鍎遍崣鍡欐嫚椤撶喓銆婂Δ鍌浢肩€垫帡濡?
  - `StarterKit` 闁稿繑濞婂Λ瀛橆渶濡鍚?`codeBlock`闁挎稑鐭傛导鈺呭礂瀹ュ嫮鐟?`CodeBlockLowlight` 闂佹彃绉撮ˇ鎻掆枖閵娿儱鏂€闁?
  - 濞寸媴绲块悥婊堝锤濡や胶澹夌€殿喖绻楄棢濮?VSCode Solarized Light 闁?token 闁哄嫮濮撮惃鐘绘晬閸фyword/string/number/comment/variable/type 缂佹稑顧€缁辨岸濡?
- 濡ょ姴鐭侀惁澶岀磼閹惧浜柨?
  - `pnpm lint` 闂侇偅淇虹换鍐Υ?
  - `pnpm test` 闂侇偅淇虹换鍐晬?2/12闁挎稑顦埀?
  - `pnpm build` 闂侇偅淇虹换鍐Υ?

## 2026-02-24 婵犲﹥鑹炬慨鈺呭级閿熺姭鍋撹箛鏃€顫栭柛鏍ㄧ墧缁楀矂宕㈤懡銈庡敳濠?
- [x] 缂傚倹鐗炵欢顐﹀礌閻戞娉婇柛鏂诲妽濞碱垱娼妸鈺€澹曢柤鍐叉湰濞呮瑩寮ㄩ柅娑滅缂佺虎鍨堕埀顒€绻戝Σ?
- [x] 濞寸媴绲块悥婊堝锤濡や胶娉婇柛鏂诲妽濞碱垱娼妸鈺€澹曢柤鍐叉湰濞呮瑩寮ㄩ柅娑滅缂佺虎鍨堕埀顒€绻戝Σ?
- [x] 闁告ê顭峰▍搴☆煥濮橆剙袟闁哄鈧尙鐟愬☉鎾愁儑椤斿嫭寰勭€涙ê鐦婚梺?
- [x] 閺夆晜鍔橀、鎴烆殽瀹€鍐闁挎稒鐡猵npm build`

## 2026-02-24 婵犲﹥鑹炬慨鈺呭级閿涘嫷鍞插鑸垫綑閸氬鈧綊鈧稒鍙忓?+ Callout 鐎殿喗娲滈弫銈夊绩椤栨稑鐦?
- [x] 鐎殿喖鎼€垫彃顭ㄥ顒€袟闁哄绱曢鍕緞閹绢喗顓洪柦妯虹箺椤宕氬▎娆戠闁?`:single-button` 闁稿繒鍘ч鎰▔鎼淬劉鍋撹箛鏃€顫栭柡鍐Ь缁旂喎顩奸崱妤€骞戦幖瀛樻穿缁?
- [x] 闁哄倹婢橀·鍐矗椤栨瑧绠介柣?`data-callout` 闁汇劌瀚崵婊呪偓瑙勭煯缁?`blockquote` 闁圭鏅涢惈?
- [x] 闁圭鏅涢惈?markdown 缂傚倹鐗炶闁活喕绶ょ槐婵嬪绩椤栨稑鐦?`[!NOTE|TIP|IMPORTANT|WARNING|CAUTION]`
- [x] 閻炴稏鍎遍崢?Callout 缂傚倹鐗炶闁活喕鐒︾粊瀵告嫚?
- [x] 閺夆晜鍔橀、鎴烆殽瀹€鍐闁挎稒鐡猵npm lint`闁靛棔姊梡npm test`闁靛棔姊梡npm build`

## 2026-02-24 闁哄牜鍓濋悿鍡欑磼閹惧浜柛銉у仱閵嗘劙鏁嶉崼鐔烘硦闁告柣鍔嶅顖涚▔?Callout闁?
- 闁稿繑濞婇弫顓㈠绩閻熸澘袟闁?
  - 婵犲﹥鑹炬慨鈺呭级閳╁啫鐦婚梺绛嬪枟閻楀崬顕ｈ箛姣稿宕?`::-webkit-scrollbar-button:single-button` 濞戞挸瀛╅弻鐔煎触閹存粌鎮忕紒顐＄串缁辨繄绱掗悢鍓侇伇闂傚懏鍔樺Λ宀勭嵁鐠哄搫骞戦幖瀛樻磻鐠愮喖鏌呰箛鏃€顫栭柡鍐Ь缁旂喎顩奸崱鎰ㄥ亾?
  - 闁哄倹婢橀·?`CalloutBlockquote` 闁圭鏅涢惈宥夋晬鐏炶偐绠介柣?`blockquote[data-callout]` 閻忕偟鍋為埀顑秶绀夐梺顒€鐏濋崢銈囩磽閺嶎剛甯嗛柛姘凹濞戭亝寰?callout 缂侇偉顕ч悗鐑藉Υ?
  - `markdownCodec` 濠⒀呭仜婵?callout 濡澘瀚ˇ鈺呮偠閸℃洜鐟㈤柛銉у仜閸熸挾鎲撮崟顐㈢仧闁挎稑鏈弫顕€骞?GitHub 濡炲瀛╅悧?`[!NOTE|TIP|IMPORTANT|WARNING|CAUTION]`闁?
  - 闁哄倹婢橀·?callout 缂傚倹鐗炶闁活喕鐒︾粊瀵告嫚閺囩姵鏆忓〒姘儜缁辨瑧鈧數鍘ч崣鍡樼▔鎼粹槅鍤ら柛鎴犲皑缁辨岸濡?
- 濡ょ姴鐭侀惁澶岀磼閹惧浜柨?
  - `pnpm lint` 闂侇偅淇虹换鍐Υ?
  - `pnpm test` 闂侇偅淇虹换鍐晬?4/14闁挎稑顦埀?
  - `pnpm build` 闂侇偅淇虹换鍐Υ?

## 2026-02-24 闁搞儱澧芥晶鏍с€掗崣澶屽帬濞戞挸楠稿濠氬礄缂佹ɑ鏉瑰鍫嗗倹鍙忓?
- [x] 濞ｅ浂鍠栭ˇ鏌ュ炊閸撗冾暬 markdown 閹兼潙绻愰崹顏堝礌閺嶇數绀勯梺顒€鐏濋崢銈夊及閸撗佷粵 `[]()` 濞戞挸閰ｉ幗濂稿箳閵夛附鐎柡鍫墾缁?
- [x] 閻庡湱鍋熼獮鍥ㄎ楅悩宕囧灱鐎归潻绠撻弫顓㈠矗鐏炶棄姣婇柛銉ュ⒔婢ф牠寮ㄩ幆褋浜ｅΛ鏉垮椤秹鏁嶉崼婊呯煂闁哄嫬澧介妵姘跺炊閸撗冾暬闁?
- [x] 閻炴稏鍎遍崢鏍儎缁嬪灝褰犳繛鏉戭儓閻?
- [x] 閺夆晜鍔橀、鎴烆殽瀹€鍐闁挎稒鐡猵npm lint`闁靛棔姊梡npm test`闁靛棔姊梡npm build`

## 2026-02-24 闁哄牜鍓濋悿鍡欑磼閹惧浜柛銉у仱閵嗘劙鏁嶉崼婵囩闁绘娲︾憰鍡涘蓟閹捐尙鐟㈤柡鈧幆褋浜ｉ柨?
- 闁稿繑濞婇弫顓㈠绩閻熸澘袟闁?
  - 闁搞儱澧芥晶鏍偓鐢靛帶閸ゎ參鏌呴弰蹇曞竼闁哄倹婢橀·鍐灳濠婂棛鐔呯€垫澘瀚悾銊╁礂閵婏腹鍋撹閳ь剚绻傞崹浠嬪棘椤撱劎绐梂indows 闁哄牜鍓欏﹢瀵告崉椤栨氨绐為柕鍡曠瀵粙寮鍕祮闁靛棔鑳堕埞鏍冀缁楄　鍋撴担鐟邦仾闁告瑩顥撻悺鎴﹀捶閻戞ɑ鐝紓浣哄枍缁斿鈧數鍘ч崵顓熺▔?`<img ...>`闁挎稑鐭傛导鈺呭礂瀹ュ懏绀€閻犲洩顕ч幃妤呭及閸撗佷粵 `[]()` 闁告鍠愰弸鍐Υ?
  - 闁搞儱澧芥晶鏍嚍閸屾粌浠柡鈧娑樼槷濮捬呭У閻栵絽顔忛敃鍌涙殯闁告瑥鑻崵顕€寮ㄩ幆褋浜ｉ柨娑樻湰閺備焦寰勮閻即宕ｉ鍛邦洬闁哄本鎸稿ù姗€鎮ч崶銊︽嫳濞达絾鎼槐婵囩▔瀹ュ棙鈻旂紒鈧悰鈾€鍋撳鍐╃闁稿秴绻嗛埀顒佺箖閸ㄣ劑宕楅張鐢甸搨闁哄倸娲ら悺褔鏁嶅☉娆愭殰闁归晲鑳堕崑锝夊礄婵犳矮绱曠紓鍐ｆ櫆閸?`Esc` 闁稿繑濞婂Λ鎾Υ?
  - 閻炴稏鍎遍崢?unsafe local path 闁汇劌瀚槐顏嗘喆閿濆洨鍨虫繛鏉戭儓閻︻垶濡?
- 濡ょ姴鐭侀惁澶岀磼閹惧浜柨?
  - `pnpm lint` 闂侇偅淇虹换鍐Υ?
  - `pnpm test` 闂侇偅淇虹换鍐晬?5/15闁挎稑顦埀?
  - `pnpm build` 闂侇偅淇虹换鍐Υ?

## 2026-02-24 闂佸墽鍋撶敮瀵告嫚椤撶喓銆婇柡鈧娑樼槷
- [x] 闁哄倹婢橀·?markdown 闂佸墽鍋撶敮瀛樻綇閹惧啿寮抽悷娆忓閸垶鏁嶉崸鍒恡ext](url)` 闁煎浜滄慨鈺傛姜椤掍礁搴婂☉鎾存そ閹藉ジ骞掗妷顖滅
- [x] 闁规亽鍎遍崣鍡欑磽閺嶎剛甯嗛柛?Link 闁圭鏅涢惈宥夋煣閹规劗鐔?
- [x] 閻炴稏鍎遍崢鏍煣閻愵剙澶?round-trip 婵炴潙顑堥惁?
- [x] 閺夆晜鍔橀、鎴烆殽瀹€鍐闁挎稒鐡猵npm lint`闁靛棔姊梡npm test`闁靛棔姊梡npm build`

## 2026-02-24 闁哄牜鍓濋悿鍡欑磼閹惧浜柛銉у仱閵嗘劙鏁嶉崼銉︽嚑闁规亽鍎撮銏犫枖閺囶亞绀?
- 闁稿繑濞婇弫顓㈠绩閻熸澘袟闁?
  - 闁哄倹婢橀·?`LinkWithMarkdown` 闁圭鏅涢惈宥夋晬鐏炵偓鏆滈柟闀愮濠€顏嗙磽閺嶎剛甯嗛柛锝冨妼閸炲瓨娼忛幘鍐插汲 `[text](url)` 闁告艾姘﹂崵婊堝礉閵娿劍绁柟璇℃線鐠愮喖鏌ч悙顒€澶?mark闁?
  - 閻熸瑥瀚崹顖炴嚊椤忓嫬袟閻犲搫鐤囩换鍐炊閸撗冾暬閻犲浂鍘界涵?`![alt](src)`闁挎稑鐭傛导鈺呭礂瀹ュ嫮鐟㈤柛銉ュ⒔婢ф牗娼忛幘鍐插汲闁告劘灏欓悰濠囧Υ?
  - 閻炴稏鍎遍崢鏍煣閻愵剙澶嶇紓鍌涚墳琚欓柣?round-trip 婵炴潙顑堥惁顖炲Υ?
- 濡ょ姴鐭侀惁澶岀磼閹惧浜柨?
  - `pnpm lint` 闂侇偅淇虹换鍐Υ?
  - `pnpm test` 闂侇偅淇虹换鍐晬?6/16闁挎稑顦埀?
  - `pnpm build` 闂侇偅淇虹换鍐Υ?

## 2026-02-24 EXE 閻庣懓顦抽ˉ濠囧礌閸涱喚鈧垰顕?
- [x] 闁圭瑳鍡╂斀 `pnpm tauri:build`
- [x] 闁汇垻鍠愰崹?NSIS 閻庣懓顦抽ˉ濠勭矙鐎ｎ亞纰嶉柨娑樻緫64闁?
- 濞存籂鍛挅闁?
  - `src-tauri/target/release/bundle/nsis/MDPad_0.1.0_x64-setup.exe`

## 2026-02-24 闁告帒妫楃€垫ɑ瀵煎Ο鍝勵嚙闁挎稑娼恲namic import + manualChunks闁?
- [x] 闂佹彃绉撮崯?`manualChunks` 闁告帒妫涚划宥夋晬鐏炴儳顎曢柛?`vendor` 濞戞挾鍎ゅú璺ㄧ磼閸℃瑧鐓堥幖杈剧細缁堕鎸ч弽褎鍋?
- [x] 閻?`UnsavedChangesModal` 闁衡偓闁稖绀嬮柛鏂诲妽閳ь兛绀侀閬嶅礂閵夈儴瀚欓柟绋款樀濞撳爼宕濋悩鐑樼グ
- [x] 閺夆晜鍔橀、鎴烆殽瀹€鍐闁挎稒鐡猵npm lint`闁靛棔姊梡npm test`闁靛棔姊梡npm build`
- [x] 閻犲洤瀚崣濠囧几閸曨偆绱﹂弶鍫熸尭閸ゎ厽绋夐鐔感﹂柛姘剧細缁盯寮?>500k chunk 闁告稑锕ㄩ?

## 2026-02-24 闁哄牜鍓濋悿鍡欑磼閹惧浜柛銉у仱閵嗘劙鏁嶉崼婵嗙€婚柛鏍ф噸缁鳖參宕犻弽鐢电
- 闁稿繑濞婇弫顓㈠绩閻熸澘袟闁?
  - `vite.config.ts` 闁?`manualChunks` 闂佹彃绉甸悗顖涚▔?`tauri-core / editor-core / editor-render / ui-core / icon-core / vendor-misc`闁挎稑鐬间簺闂傚嫨鍊曢妵鍥嚀鐏炲墽銆愰柣銊ュ瀹曠喐绋夐埀?`vendor` 濞撴碍绻嗙粋鍡涘锤濡炲皷鍋?
  - `UnsavedChangesModal` 濞寸姴閰ｅ銈夊箑娴ｅ壊鍤ら柛蹇嬪劜閺佸吋绋?`React.lazy` 闁告柣鍔嶉埀顑跨椤曢亶宕楅妷顖滅妤犵偠娉涙慨?`Suspense` 闁圭顦靛〒鍫曞礉閻樼儤绁伴柕?
- 濡ょ姴鐭侀惁澶岀磼閹惧浜柨?
  - `pnpm lint` 闂侇偅淇虹换鍐Υ?
  - `pnpm test` 闂侇偅淇虹换鍐晬?6/16闁挎稑顦埀?
  - `pnpm build` 闂侇偅淇虹换鍐Υ?
  - 闁哄瀚紓鎾存綇閹惧啿姣夊☉鎿冨幒缁楀宕樺鍛瘔闁?`Some chunks are larger than 500 kB` 闁告稑锕ㄩ鐔兼晬鐏炵偓浠樺?JS chunk 缂佹拝缂氱拹鐔兼晬?
    - `editor-render` ~448KB
    - `editor-core` ~443KB

## 2026-02-24 闂佸墽鍋撶敮瀵告嫚椤撶喓銆婇悗鐟拌嫰閺変粙鏁嶉崼婵囧創闁搞儱澧芥晶鏍煣閻愵剙澶嶅☉?hover闁?
- [x] 閻庣懓鑻弶?`LinkWithMarkdown`闁挎稒纰嶉弫顕€骞?`[text](url "title")` 妤犵偞鍎艰棢闁?hover 闁哄秴娲。鐣岀驳閺嶎偅娈?
- [x] 闁圭鏅涢惈?markdown 缂傚倹鐗炶闁活喕绶ょ槐浼村绩椤栨稑鐦梺鍓у亾鐢挳宕堕崜褍顣?`[![alt](src)](href)` 闁汇劌瀚彊閻庤纰嶇憰鍡涘蓟閹捐尙鐟㈤柛銉у仜閸?
- [x] 閻犲鍟弳锝夋煣閻愵剙澶嶉悗鐢靛帶閸ゎ厾鎲撮崟顐㈢仧闁挎稒纰嶅Λ銈夊及閹呯闁哄秴娲。浠嬪籍閺堢數鐟濋弶鍫熸尭閸ゎ參宕樺鍓х▏ title闁挎稑顓緊ver 濞寸姴鎳忓Ο澶岀矆?URL
- [x] 閻炴稏鍎遍崢鏍圭€ｎ厾妲搁悷鏇炴濞插﹪鏁嶅鑸垫嚑闁规亽鍎查悥锝嗭紣濡硶鍋撴笟鈧幗濂稿箳閵夈儲绂堥柣妤€娲㈤埀顑跨劍濞呮﹢鏌呭鑸垫嚑闁?round-trip
- [x] 閺夆晜鍔橀、鎴烆殽瀹€鍐闁挎稒鐡猵npm lint`闁靛棔姊梡npm test`闁靛棔姊梡npm build`

## 2026-02-24 闁哄牜鍓濋悿鍡欑磼閹惧浜柛銉у仱閵嗘劙鏁嶉崼銉︽嚑闁规亽鍎撮銏犫枖閺囩偟鏆氶柛鐘插缁?
- 闁稿繑濞婇弫顓㈠绩閻熸澘袟闁?
  - `LinkWithMarkdown` 濠⒀呭仜瀹歌鲸绋夐悜妯绘殰闁?`[text](url "title")`/`[text](<url>)` 閻熸瑱绲鹃悗浠嬫晬鐏炲€熷珯闁革负鍔庡閬嶆儑娴ｅ湱鍨煎Λ鐗埳戝鍌滀焊?`title` 闁搞儳鍋ら埀顑藉亾濞?`href` 濞寸姰鍎插褏鎼?hover 闁哄嫬澧介妵?URL闁?
  - 闁哄倹婢橀·鍐煣閻愵剙澶嶉柛銉ュ⒔婢ф牗娼忛幘鍐插汲閻熸瑥瀚崹顖炴晬鐏炵偓鏆滈柟?`[![alt](src)](href)` 闁烩晛鐡ㄧ敮瀛樻姜椤戣儻绀嬮柛銉ュ⒔婢ф牠鎳為崒婊冧化妤犵偠鍩栭幆锛勬暜?`data-link-href/data-link-title` 闁稿繐鍟弳鐔煎箲椤旇　鍋?
  - `markdownCodec` 濠⒀呭仜婵偤鏌ч悙顒€澶嶉悗鐢靛帶閸ゎ厾鎲撮崟顐㈢仧闁挎稑鐭傛导鈺呭礂?`title===href` 闁哄啳娉涘ú鏍礃濞嗗繐鏅冲ù锝嗙懄閻栵絾锛愬鍫㈠耿闁哄倹婢橀·鍐煣閻愵剙澶嶉柛銉ュ⒔婢ф牠鎯冮崟顐殼闁稿繈鍎查弫濂稿礃濞嗗海鐟㈤悗鐢靛帶閸ゎ參宕堕悙鎻掓櫢闁?
  - 闁哄倹婢橀·?闁哄洤鐡ㄩ弻濠偯圭€ｎ厾妲搁柨娑樼焷椤╊偊鎯勯弽銊︾彯闂侇偅宀搁幗濂稿箳閵夛絺鍋撴担瑙勨枖鐎殿喖绻戦悥锝嗭紣濮椻偓閹藉ジ骞掗妷锝傚亾娓氣偓閹藉ジ骞掗妷銉︾闁绘娲ら閬嶅礂閵夈倗鐟㈤悗鐢靛帶閸ゎ參濡?
- 濡ょ姴鐭侀惁澶岀磼閹惧浜柨?
  - `pnpm lint` 闂侇偅淇虹换鍐Υ?
  - `pnpm test` 闂侇偅淇虹换鍐晬?9/19闁挎稑顦埀?
  - `pnpm build` 闂侇偅淇虹换鍐Υ?

## 2026-02-24 闁?Logo 闁哄洦瀵у畷鏌ユ晬閸︾浛uri 闁搞儳鍋撻悥锝夋晬?
- [x] 濞达綀娉曢弫?`src-tauri/icons/logo-source.svg` 闂佹彃绉堕弫鎾诲箣閹邦剙寮挎鐐插暱瑜版挳宕堕悙顒傚灱閻犙冨缁?
- [x] 闁哄稄绻濋悰?`icon.ico/icon.icns/icon.png` 濞戞挸楠搁ˇ璺ㄤ焊閸濆嫷鍤熼柛銉у亾閻栵綁宕搁崶褍鍤掗柡鍥х摠閺?
- [x] 閺夆晜鍔橀、鎴烆殽瀹€鍐闁挎稒鐡猵npm build`闁靛棔姊梡npm tauri:build`

## 2026-02-24 闁哄牜鍓濋悿鍡欑磼閹惧浜柛銉у仱閵嗘劙鏁嶉崼鐔哥厐 Logo闁?
- 闁稿繑濞婇弫顓㈠绩閻熸澘袟闁?
  - 濞达綀娉曢弫?`pnpm tauri icon src-tauri/icons/logo-source.svg` 闂佹彃绉寸紓鎾诲炊閻愵剛鍨奸悹褍瀚鍥Υ?
  - 鐎圭寮跺ú鍧楀棘?`src-tauri/icons` 濞?Windows/macOS/iOS/Android 闁稿繈鍔岄〃婊堝炊閻愵剛鍨奸柡鍌氭矗濞嗐垽鏁嶉崼婵囧創 `icon.ico`闁靛棔姊梚con.icns`闁靛棔姊梚con.png` 闁告瑥锕らˇ璺ㄤ焊閸濆嫷鍤?PNG闁挎稑顦埀?
- 濡ょ姴鐭侀惁澶岀磼閹惧浜柨?
  - `pnpm build` 闂侇偅淇虹换鍐Υ?
  - `pnpm tauri:build` 闂侇偅淇虹换鍐Υ?
  - 閻庣懓顦抽ˉ濠囧礌閸涱剟鐛撻柣妞绘櫔缁?
    - `src-tauri/target/release/bundle/nsis/MDPad_0.1.0_x64-setup.exe`

## 2026-02-24 Windows 闁搞儳鍋撻悥锝夊嫉椤忓嫬鐓曢柡鍌滃閻楁挳宕堕悩杈ㄥ弿濠?
- [x] 閻庤鐭紞鍛村灳濠娾偓閹广垽宕濋埄鍐焿濞戞捁顕уù姗€寮?闁哄倸娲ｅ▎銏ゅ炊閻愵剛鍨煎ù鐘茬У濡偊鏁嶇€诡湹ver 濡澘瀚～宥咁啅閸欏绾柡鍌涘閳ь剚绻勫▓鎴︽儑閻旈鏉介柡宥囨嚀濞?
- [x] 濞ｅ浂鍠栭ˇ?`src-tauri/build.rs`闁挎稑鐬奸垾妯荤┍濠靛棙绂堥柡宥呮处閺嬪啯绂掔捄鍝勭秮闁告牗鐗曡ぐ鑼喆閿曗偓瑜?Rust 閻犙冨缁噣鏌屽鍥╂そ閻?
- [x] 闂佹彃绉甸弻濠囧箥閹惧啿鐦舵鐐茬埣閻涙瑧鎷?`target/release/mdpad.exe` 闁告劕鎳庣粊鐢稿炊閻愵剛鍨肩€圭寮跺ú鍧楀棘?
- [x] 閺夆晜鍔橀、鎴烆殽瀹€鍐闁挎稒鐡猵npm tauri:build`

## 2026-02-24 闁哄牜鍓濋悿鍡欑磼閹惧浜柛銉у仱閵嗘劙鏁嶉崷绀絥dows 闁搞儳鍋撻悥锝夊礆闁垮鐓€闁?
- 闁哄秶鎳撳ú婊呪偓瑙勭煯缂嶅懘鏁?
  - `tauri_build` 濞寸姴鎳愬ú鍐触?`tauri.conf.json`闁挎稑鏈﹢顓㈡儎閹存繃鍎?`src-tauri/icons/*`闁挎稑鑻閬嶆嚊鐎涙ɑ绂岄柟骞垮灩濞存﹢寮介崶褎鍊?`resource.lib` 濞?`mdpad.exe` 濞寸姴绉磋ぐ鏌ユ嚄閼恒儵鍎撮柣顫妽濡偆鎸ч崟顒傜埍闁?
- 闁稿繑濞婇弫顓㈠绩閻熸澘袟闁?
  - 闁?`src-tauri/build.rs` 濠⒀呭仜婵?`cargo:rerun-if-changed=icons` 濞戞挸楠搁崣褔鏌?icon 闁哄倸娲ｅ▎銏ゆ儎閹存繃鍎旈柨娑樻綁icon.ico`/`icon.icns`/`icon.png`闁挎稑顦埀?
  - 闂佹彃绉甸弻濠囧箥瑜戦、?`pnpm tauri:build`闁挎稑鐬奸垾妯兼媼?`resource.lib` 濞?`target/release/mdpad.exe` 闁秆冩喘閸ｆ悂寮幍顔芥櫢闁瑰瓨鍔戦埀?
- 濡ょ姴鐭侀惁澶岀磼閹惧浜柨?
  - `pnpm tauri:build` 闂侇偅淇虹换鍐Υ?
  - `target/release/mdpad.exe` 闁搞儳鍋撻悥锝咁啅閹绘帒缍佸☉鎾跺劋閺屽﹦绱橀懞銉ф▍ logo闁?

## 2026-02-24 Windows 闁搞儳鍋撻悥锝夊及閸撗佷粵閻炴稏鍎遍崢鏍ㄧ┍椤旂⒈妲婚柨娑樼墕椤﹁法浜搁崫鍕靛殶 ICO闁?
- [x] 濠㈣泛绉甸悧宕団偓鐟邦槼椤ュ﹦鎹勯姘辩獮濞戞挸瀛╅悗顖氼嚈鏉炰即鐛撻柣妞绘櫔缁辨繄娑甸娆惧悋闁炽儲绮庨悰銉╁矗閿濆鏆曢悷娆忕墕濞存﹢寮介崶褍鍤掗柛娆惷肩徊鐐鐠囨彃顫ら柡?闁哄倸娲ｅ▎銏ゅ炊閻愵剛鍨煎ù鐘茬Т缁辨挾鏁化鏇楀亾?
- [x] 閻庤鐭紞?`src-tauri/icons/icon.ico` 濞寸姴鎳庨幆?`256x256` 闁告娲栭弰鍌溾偓鍨摃缁侇偄鈹?
- [x] 闂佹彃绉寸紓?`icon.ico` 濞戞挸鎼ˇ璺ㄤ焊閸濆嫷鍤熼柨娑樻綁16/24/32/48/64/128/256`闁?
- [x] 闂佹彃绉甸弻濠囧箥瑜戦、?`pnpm tauri:build`
- [x] 闂傚牊鐟╃划顖溾偓鐟邦槼椤ュ﹪寮弶鍨樁妤犵偠娉涢崺娑㈠棘閺夋寧绂堥柡宥呮川缁憋妇鈧稒锕槐妾俰e4uinit -show/-ClearIconCache/-ClearLnkIconCache`闁?

## 2026-02-24 闁哄牜鍓濋悿鍡欑磼閹惧浜柛銉у仱閵嗘劙鏁嶉崼婵愭▼閻忓繐鎼?ICO闁?
- 闁哄秶鎳撳ú婊呪偓瑙勭煯缂嶅懘鏁?
  - `icon.ico` 缂傚倸鎼惃顖滀焊韫囨挻妲€閻庣數顭堝ù姗€寮介崶锔剧Т闁挎稑鑻閬嶆嚊?Windows 闁革负鍔嬮幑銏ゅ礉閳╁啰鍩夐柟绋款樀閹告娊骞嬮弽銊︾€ù鐘烘硾濞存﹢寮介崶鈺冩惣閻忓繐绻愰弰鍌溾偓鐢殿焾濠р偓闁哄拋鍨卞Λ銈呪枖閺囩妼鏃傗偓瑙勮壘瑜板洭宕氶弶璺ㄥ畨闁活潿鍔屽ù姗€寮介崶銉㈠亾?
- 闁稿繑濞婇弫顓㈠绩閻熸澘袟闁?
  - 濞达綀娉曢弫?`src-tauri/icons/icon.png` 闂佹彃绉寸紓?`src-tauri/icons/icon.ico`闁挎稑鐭佽棢濮掔粯鍔曢ˇ璺ㄤ焊閸濆嫷鍤熼柛銉у亾閻栵絾鎷呭鍐ｅ亾?
  - 闂佹彃绉甸弻濠囧箥閹惧啿鐦舵鐐舵硾閻ｃ劎鎲楅崪鍐閻庣懓顦抽ˉ濠囨儎椤旇偐绉?`C:\\Users\\endea\\AppData\\Local\\MDPad\\mdpad.exe` 鐎圭寮跺ú鍧楀棘閺夊灝鐓傞柡鍌滃閻庮垰顕欓搹鐟邦暭闁哄牜鍏欓埀?
- 濡ょ姴鐭侀惁澶岀磼閹惧浜柨?
  - `pnpm tauri:build` 闂侇偅淇虹换鍐Υ?
  - `icon.ico` 閻忓繐鎼顓㈡⒖閸℃鍊ら柡宥忕節閻涙瑩鏌呭宕囩畺闁挎稒鐡?6/24/32/48/64/128/256`闁?
  - 閺夆晜鍔橀、鎴﹀棘閸ワ附顐藉☉鎾抽閻ｃ劎鎲楅崨顔界€ù鐘烘硾濞煎酣宕ｉ娑樼倒闁告瑦鐗曢崺宀勫触鐏炶偐顏遍柡?logo 闁搞儳鍋撻悥锝夊Υ?

## 2026-02-24 Transparent SVG 鍥炬爣閲嶅缓 + 涓嫳鍙岃 NSIS 瀹夎鍖咃紙鎵ц璁″垝锛?
- [x] 浠?`src-tauri/icons/logo-source.svg` 閲嶆柊鐢熸垚 Tauri 鍥炬爣璧勪骇锛圥NG/ICO锛?
- [x] 鏇存柊 `src-tauri/tauri.conf.json`锛氶厤缃?NSIS `languages` 涓?`displayLanguageSelector`
- [x] 鏋勫缓 NSIS 瀹夎鍖咃紙`pnpm tauri build --bundles nsis`锛?
- [x] 鏍搁獙瀹夎鑴氭湰璇█娉ㄥ叆涓庡畨瑁呭寘浜х墿璺緞
- [x] 鍦ㄦ湰鑺傝ˉ鍏呯粨鏋滃洖椤?
## 2026-02-24 Transparent SVG icon regen + NSIS zh/en package (review)
- Regenerated icons from `src-tauri/icons/logo-source.svg` using `pnpm tauri icon`.
- Updated `src-tauri/tauri.conf.json` NSIS config:
  - `bundle.windows.nsis.languages = ["SimpChinese", "English"]`
  - `bundle.windows.nsis.displayLanguageSelector = true`
- Built installer with `pnpm tauri build --bundles nsis`.
- Output: `src-tauri/target/release/bundle/nsis/MDPad_0.1.0_x64-setup.exe`.
- Verified `installer.nsi` includes `MUI_LANGUAGE "SimpChinese"`, `MUI_LANGUAGE "English"`, and `DISPLAYLANGUAGESELECTOR "true"`.
- Runtime note: fixed dependency and sandbox execution issues (`pnpm install`, escalated build for `esbuild spawn EPERM`).
