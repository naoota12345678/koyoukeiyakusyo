# 雇用契約書管理システム設計履歴

## プロジェクト概要
- **システム名**: 雇用契約書管理システム
- **基盤**: 給与明細システムの認証・会社・従業員データを共用
- **目的**: 労働条件通知書・雇用契約書の作成・管理・期限通知の自動化

## 設計完了項目

### ✅ 1. システム要件定義と構築計画
- **アプローチ**: 給与明細システムをコピーして独立したシステムを構築
- **認証基盤**: 既存のFirebase認証を共用
- **データ共有**: 会社情報・従業員情報は共通、契約書データは独立管理

### ✅ 2. データ構造設計
```javascript
// contracts コレクション
{
  contractId: auto,
  companyId: string,
  employeeId: string,
  
  // 契約期間（期限管理対応）
  period: {
    type: "permanent" | "fixed-term",
    startDate: date,
    endDate: date,
    renewalOption: string,
    renewalCount: number,
    maxRenewals: number
  },
  
  // 期限通知管理
  expiryManagement: {
    alertSettings: [
      { days: 90, enabled: true, recipients: [] },
      { days: 60, enabled: true, recipients: [] },
      { days: 30, enabled: true, recipients: [] },
      { days: 14, enabled: true, recipients: [] }
    ],
    lastNotification: date,
    status: "active" | "expiring_soon" | "expired"
  },
  
  // その他項目...
}
```

### ✅ 3. 期限通知システム
- **通知タイミング**: 90日前、60日前、30日前、14日前（カスタマイズ可能）
- **自動判定**: Cloud Functions（毎日9:00実行）で期限チェック
- **Gmail SMTP**: 既存の給与システムと同じメール送信基盤を活用
- **ダッシュボード**: 期限アラート表示（🔴期限切れ、🟡30日以内、🟢90日以内）

### ✅ 4. CSVマッピング機能
- **現行分析**: 110項目の詳細CSVを8つの基本パターンに分類
  - 20時間未満パート（雇用保険×、社保×）
  - 20時間未満学生（雇用保険×、社保×）
  - 30時間未満学生（雇用保険×、社保×）
  - 30時間未満パート（雇用保険○、社保×）
  - フルアルバイト学生（雇用保険×、社保×）
  - フルパート（雇用保険○、社保○）
  - 契約社員（雇用保険○、社保○）
  - 正社員（雇用保険○、社保○、期間の定めなし）

- **自動入力ロジック**: 週労働時間を選択→雇用形態を選択→関連項目を自動設定
- **法改正対応**: Firestoreでルール管理、管理画面から変更可能

### ✅ 5. PDF管理機能設計
- **方式**: 都度生成方式（法改正対応のため）
- **テンプレート**: 4種類
  1. 労働条件通知書（有期雇用）
  2. 労働条件通知書（無期雇用）
  3. 雇用契約書（有期雇用）
  4. 雇用契約書（無期雇用）

- **印刷時選択**: 同一データから書類種別を選択して出力
- **座標マッピング**: PDF上の特定座標にデータを配置

### ✅ 6. PDFテンプレート管理システム
```javascript
// pdfTemplates コレクション
{
  templateId: "labor_contract_2024_04",
  templateName: "労働条件通知書兼雇用契約書（有期雇用）",
  version: "2024.04",
  lawCompliance: "2024年4月労働基準法改正対応",
  
  fieldMappings: {
    employeeName: { page: 1, x: 150, y: 200, width: 200, height: 20 },
    contractStartDate: { page: 1, x: 200, y: 300, width: 100, format: "YYYY年MM月DD日" }
    // 各フィールドの座標指定...
  }
}
```

### ✅ 7. 会社設定管理システム
```javascript
// companySettings コレクション
{
  companyId: string,
  companyName: string,           // #{COMP_NAME}
  
  basicInfo: {
    companyAddress: string,      // #{COMP_ADDR}
    ceoName: string,            // #{CEO_NAME}
    employeeCount: number       // #{EMP_COUNT}
  },
  
  workRegulations: {
    storageLocation: string,     // #{WORK_REG_LOC}
    confirmationMethod: string   // #{WORK_REG_METHOD}
  },
  
  retirement: {
    hasRetirement: boolean,      // #{RET_HAS}
    retirementAge: number,       // #{RET_AGE}
    hasRehire: boolean,          // #{REHIRE_HAS}
    rehireMaxAge: number        // #{REHIRE_AGE}
  },
  
  resignation: {
    noticePeriod: number,        // #{RESIGN_NOTICE} (default: 30)
    procedure: string           // #{RESIGN_PROC}
  },
  
  holidays: {
    regularDays: [],            // #{REGULAR_DAYS}
    irregularDays: string,      // #{IRREGULAR_DAYS}
    flexibleScheduling: boolean // 個別設定可能フラグ
  }
}
```

### ✅ 8. 就業形態別勤務時間パターン設計

勤務時間の枠内は就業形態（変形労働時間制・裁量労働制等）によって記載内容が変わるため、以下のパターンを定義：

```javascript
// workingTimePatterns コレクション
{
  // ①固定勤務制
  "fixed_schedule": {
    patternName: "固定勤務制",
    displayFields: {
      startTime: { symbol: "#{START_TIME}", required: true },
      endTime: { symbol: "#{END_TIME}", required: true },
      breakTime: { symbol: "#{BREAK_TIME}", required: true },
      weeklyHours: { symbol: "#{WEEKLY_HOURS}", required: false }
    },
    pdfMapping: {
      checkboxPosition: { page: 1, x: 85, y: 410 },
      startTimePosition: { page: 1, x: 155, y: 430 },
      endTimePosition: { page: 1, x: 225, y: 430 }
    },
    remarks: "#{FIXED_SCHEDULE_REMARKS}"
  },
  
  // ②変形労働時間制
  "flexible_working_time": {
    patternName: "変形労働時間制",
    subTypes: {
      "1month": "1ヶ月単位",
      "1year": "1年単位", 
      "1week": "1週間単位"
    },
    displayFields: {
      flexType: { symbol: "#{FLEX_TYPE}", required: true },
      pattern1Start: { symbol: "#{FLEX_START_1}", required: true },
      pattern1End: { symbol: "#{FLEX_END_1}", required: true },
      pattern1Days: { symbol: "#{FLEX_DAYS_1}", required: false },
      pattern2Start: { symbol: "#{FLEX_START_2}", required: false },
      pattern2End: { symbol: "#{FLEX_END_2}", required: false },
      pattern2Days: { symbol: "#{FLEX_DAYS_2}", required: false },
      pattern3Start: { symbol: "#{FLEX_START_3}", required: false },
      pattern3End: { symbol: "#{FLEX_END_3}", required: false },
      pattern3Days: { symbol: "#{FLEX_DAYS_3}", required: false }
    },
    pdfMapping: {
      checkboxPosition: { page: 1, x: 85, y: 450 },
      typePosition: { page: 1, x: 200, y: 450 },
      pattern1StartPos: { page: 1, x: 155, y: 470 },
      pattern1EndPos: { page: 1, x: 225, y: 470 }
    },
    remarks: "#{FLEXIBLE_SCHEDULE_REMARKS}"
  },
  
  // ③フレックスタイム制
  "flextime": {
    patternName: "フレックスタイム制",
    displayFields: {
      flexibleStart: { symbol: "#{FLEXIBLE_START}", required: true },
      flexibleEnd: { symbol: "#{FLEXIBLE_END}", required: true },
      coreTimeStart: { symbol: "#{CORE_START}", required: true },
      coreTimeEnd: { symbol: "#{CORE_END}", required: true }
    },
    pdfMapping: {
      checkboxPosition: { page: 1, x: 85, y: 510 },
      flexStartPos: { page: 1, x: 200, y: 530 },
      flexEndPos: { page: 1, x: 280, y: 530 },
      coreStartPos: { page: 1, x: 200, y: 550 },
      coreEndPos: { page: 1, x: 280, y: 550 }
    },
    defaultText: "始業及び終業の時刻は労働者の決定に委ねる",
    remarks: "#{FLEXTIME_REMARKS}"
  },
  
  // ④事業場外みなし労働時間制
  "deemed_working_time": {
    patternName: "事業場外みなし労働時間制", 
    displayFields: {
      deemedStartTime: { symbol: "#{DEEMED_START}", required: true },
      deemedEndTime: { symbol: "#{DEEMED_END}", required: true },
      deemedHours: { symbol: "#{DEEMED_HOURS}", required: true }
    },
    pdfMapping: {
      checkboxPosition: { page: 1, x: 85, y: 570 },
      startTimePos: { page: 1, x: 200, y: 590 },
      endTimePos: { page: 1, x: 280, y: 590 }
    },
    remarks: "#{DEEMED_WORKING_REMARKS}"
  },
  
  // ⑤裁量労働制
  "discretionary_working": {
    patternName: "裁量労働制",
    displayFields: {
      baseStartTime: { symbol: "#{DISC_START}", required: true },
      baseEndTime: { symbol: "#{DISC_END}", required: true },
      discretionaryHours: { symbol: "#{DISC_HOURS}", required: true }
    },
    pdfMapping: {
      checkboxPosition: { page: 1, x: 85, y: 610 },
      startTimePos: { page: 1, x: 200, y: 630 },
      endTimePos: { page: 1, x: 280, y: 630 }
    },
    defaultText: "を基本とし、労働者の決定に委ねる",
    remarks: "#{DISCRETIONARY_REMARKS}"
  }
}
```

**就業形態別UI表示制御**:
```javascript
// WorkingTimePatternSelector.js
const WorkingTimePatternSelector = ({ selectedPattern, onChange }) => {
  const [patternData, setPatternData] = useState({});
  
  const renderPatternFields = () => {
    switch(selectedPattern) {
      case 'fixed_schedule':
        return (
          <div className="fixed-schedule-fields">
            <TextField label="始業時刻" value={patternData.startTime} />
            <TextField label="終業時刻" value={patternData.endTime} />
            <TextField label="休憩時間" value={patternData.breakTime} />
          </div>
        );
        
      case 'flexible_working_time':
        return (
          <div className="flexible-schedule-fields">
            <Select label="変形労働時間制の種類">
              <Option value="1month">1ヶ月単位</Option>
              <Option value="1year">1年単位</Option>
              <Option value="1week">1週間単位</Option>
            </Select>
            
            <div className="shift-patterns">
              <h4>シフトパターン</h4>
              <div className="pattern-1">
                <TextField label="①始業" value={patternData.pattern1Start} />
                <TextField label="①終業" value={patternData.pattern1End} />
                <TextField label="適用日" value={patternData.pattern1Days} />
              </div>
              <div className="pattern-2">
                <TextField label="②始業" value={patternData.pattern2Start} />
                <TextField label="②終業" value={patternData.pattern2End} />
                <TextField label="適用日" value={patternData.pattern2Days} />
              </div>
              <div className="pattern-3">
                <TextField label="③始業" value={patternData.pattern3Start} />
                <TextField label="③終業" value={patternData.pattern3End} />
                <TextField label="適用日" value={patternData.pattern3Days} />
              </div>
            </div>
          </div>
        );
        
      case 'flextime':
        return (
          <div className="flextime-fields">
            <div className="flexible-time">
              <TextField label="フレキシブルタイム（始業）" placeholder="○時○分から" />
              <TextField label="フレキシブルタイム（終業）" placeholder="○時○分まで" />
            </div>
            <div className="core-time">
              <TextField label="コアタイム開始" value={patternData.coreTimeStart} />
              <TextField label="コアタイム終了" value={patternData.coreTimeEnd} />
            </div>
            <Typography variant="body2" color="textSecondary">
              始業及び終業の時刻は労働者の決定に委ねる
            </Typography>
          </div>
        );
        
      case 'deemed_working_time':
        return (
          <div className="deemed-working-fields">
            <TextField label="基準始業時刻" value={patternData.deemedStartTime} />
            <TextField label="基準終業時刻" value={patternData.deemedEndTime} />
            <TextField label="みなし労働時間" value={patternData.deemedHours} />
            <Alert severity="info">
              事業場外での業務に従事する場合に適用
            </Alert>
          </div>
        );
        
      case 'discretionary_working':
        return (
          <div className="discretionary-fields">
            <TextField label="基本始業時刻" value={patternData.baseStartTime} />
            <TextField label="基本終業時刻" value={patternData.baseEndTime} />
            <TextField label="みなし労働時間" value={patternData.discretionaryHours} />
            <Typography variant="body2" color="textSecondary">
              を基本とし、労働者の決定に委ねる
            </Typography>
            <Alert severity="warning">
              専門業務型裁量労働制または企画業務型裁量労働制の対象業務
            </Alert>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <Card>
      <h3>勤務時間設定</h3>
      
      <FormControl>
        <FormLabel>就業形態を選択</FormLabel>
        <RadioGroup value={selectedPattern} onChange={onChange}>
          <FormControlLabel value="fixed_schedule" control={<Radio />} label="①固定勤務" />
          <FormControlLabel value="flexible_working_time" control={<Radio />} label="②変形労働時間制" />
          <FormControlLabel value="flextime" control={<Radio />} label="③フレックスタイム制" />
          <FormControlLabel value="deemed_working_time" control={<Radio />} label="④事業場外みなし労働時間制" />
          <FormControlLabel value="discretionary_working" control={<Radio />} label="⑤裁量労働制" />
        </RadioGroup>
      </FormControl>
      
      {selectedPattern && renderPatternFields()}
      
      {/* 共通項目 */}
      <div className="common-fields">
        <TextField
          label="休憩時間"
          value={patternData.breakTime}
          placeholder="例：60分"
        />
        <TextField
          label="所定週労働時間"
          value={patternData.weeklyHours}
          placeholder="例：40時間"
        />
        <FormControlLabel
          control={<Checkbox checked={patternData.overtimeWork} />}
          label="所定時間外労働あり"
        />
        <FormControlLabel
          control={<Checkbox checked={patternData.holidayWork} />}
          label="休日労働あり"
        />
      </div>
    </Card>
  );
};
```

### ✅ 9. マッピング記号一覧（110+項目）
全てのPDFマッピング対象箇所に記号を定義：

**基本情報系**
- #{EMP_NAME} - 従業員氏名
- #{COMP_NAME} - 会社名
- #{COMP_ADDR} - 会社住所
- #{CEO_NAME} - 代表取締役名

**契約期間系**
- #{START_DATE} - 契約開始日
- #{END_DATE} - 契約終了日
- #{RENEWAL_AUTO} - 自動更新
- #{RENEWAL_MAYBE} - 更新の場合あり

**2024年新ルール対応**
- #{WORK_PLACE_INIT} - 雇入れ直後の就業場所
- #{WORK_PLACE_RANGE} - 就業場所の変更範囲
- #{JOB_DESC_INIT} - 雇入れ直後の業務
- #{JOB_DESC_RANGE} - 業務の変更範囲

**勤務時間系（就業形態別）**
- #{START_TIME} - 始業時刻（固定勤務）
- #{END_TIME} - 終業時刻（固定勤務）
- #{FLEX_TYPE} - 変形労働時間制種別
- #{FLEX_START_1} - 変形①始業時刻
- #{FLEX_END_1} - 変形①終業時刻
- #{FLEX_DAYS_1} - 変形①適用日
- #{FLEXIBLE_START} - フレキシブルタイム開始
- #{FLEXIBLE_END} - フレキシブルタイム終了
- #{CORE_START} - コアタイム開始
- #{CORE_END} - コアタイム終了
- #{DEEMED_START} - みなし労働基準始業
- #{DEEMED_END} - みなし労働基準終業
- #{DEEMED_HOURS} - みなし労働時間
- #{DISC_START} - 裁量労働基準始業
- #{DISC_END} - 裁量労働基準終業
- #{DISC_HOURS} - 裁量労働みなし時間
- #{BREAK_TIME} - 休憩時間
- #{WEEKLY_HOURS} - 週労働時間

**賃金系**
- #{BASE_SALARY} - 基本給
- #{HOURLY_WAGE} - 時給
- #{TOTAL_SALARY} - 総支給額
- #{OT_RATE_60} - 60時間以内残業率

**福利厚生系**
- #{HEALTH_INS} - 健康保険
- #{EMP_INS} - 雇用保険
- #{PENSION_INS} - 厚生年金

## 運用フロー設計

### 導入フロー
1. **プロジェクトコピー**: 給与システムから独立したプロジェクトを作成
2. **会社設定**: 基本情報、就業規則、定年制、休日等を設定
3. **CSVインポート**: 既存データの一括取り込み（初回のみ）
4. **テンプレート設定**: PDFテンプレートのマッピング座標設定

### 日常運用フロー
1. **契約書作成**: 週労働時間選択→雇用形態選択→就業形態選択→自動入力→微調整→保存
2. **期限管理**: システムが自動で期限をチェック・通知
3. **PDF出力**: 印刷時に書類種別（通知書/契約書）を選択
4. **更新処理**: 期限到来前に契約更新・延長処理

## 技術仕様

### 使用技術
- **フロントエンド**: React.js（既存システムと同じ）
- **バックエンド**: Firebase Functions
- **データベース**: Cloud Firestore
- **認証**: Firebase Authentication（共用）
- **ストレージ**: Firebase Storage（PDF保存）
- **メール送信**: Gmail SMTP（既存と同じ設定）
- **PDF生成**: pdf-lib（座標指定でデータ配置）

### セキュリティ
```javascript
// Firestore Security Rules（契約書用）
match /contracts/{contractId} {
  // 読み取り：本人または管理者
  allow read: if request.auth != null && (
    request.auth.uid == resource.data.employeeId ||
    isCompanyAdmin(resource.data.companyId)
  );
  
  // 作成・更新：管理者のみ
  allow create, update: if request.auth != null && 
    isCompanyAdmin(request.resource.data.companyId);
}
```

### デプロイ方式
- **GitHub Actions**: 自動デプロイ（既存システムと同様）
- **環境変数**: GitHub Secretsで管理
- **段階的リリース**: 読み取り専用→基本機能→高度な機能

## 法改正対応戦略

### 2024年4月対応済み項目
- 就業場所・業務内容の変更範囲明示
- 就業規則の周知方法明記
- 無期転換申込権の説明強化

### 将来の法改正対応
- **テンプレートバージョン管理**: 法改正時は新テンプレート追加
- **ルールエンジン**: Firestoreでルール管理、管理画面から変更可能
- **段階的移行**: 既存契約への影響を最小化
- **通知システム**: 法改正時の自動通知・対応案内

## 実装予定フェーズ

### Phase 1: 基本システム（1-2週目）
- [x] システム要件定義
- [x] データ構造設計
- [x] 期限通知システム設計
- [x] CSVマッピング設計
- [x] PDF管理機能設計
- [x] 会社設定管理設計
- [x] 就業形態別勤務時間パターン設計
- [ ] 基本UI実装
- [ ] 認証連携

### Phase 2: 自動入力機能（3週目）
- [ ] 週労働時間ベース自動入力
- [ ] 雇用形態別ルール適用
- [ ] 就業形態別UI制御
- [ ] 会社デフォルト値の活用
- [ ] 個別上書き機能

### Phase 3: PDF生成（4週目）
- [ ] PDFテンプレート座標マッピング
- [ ] 就業形態別PDF出力制御
- [ ] 動的PDF生成機能
- [ ] 印刷時書類選択機能
- [ ] プレビュー機能

### Phase 4: 期限管理（5週目）
- [ ] Cloud Functions実装
- [ ] メール通知機能
- [ ] ダッシュボードアラート
- [ ] 自動更新ワークフロー

### Phase 5: 高度な機能（6週目以降）
- [ ] 一括処理機能
- [ ] レポート・統計
- [ ] 監査ログ
- [ ] API連携

## 想定される課題と対策

### 技術的課題
1. **PDF座標の精密性**: テンプレート変更時の座標調整
   - 対策: 座標マッピング支援ツールの実装

2. **就業形態別表示制御**: 5パターンの複雑なUI制御
   - 対策: パターン定義ファイルによる設定駆動型UI

3. **法改正への迅速対応**: 新ルール施行時の対応速度
   - 対策: テンプレートバージョン管理とルールエンジン

4. **大量データ処理**: CSV一括インポート時の処理性能
   - 対策: バッチ処理（50件ずつ）と進捗表示

### 運用課題
1. **ユーザビリティ**: 複雑な労働法要件の簡単入力
   - 対策: ウィザード形式UI、自動入力ロジック

2. **データ整合性**: 給与システムとの従業員情報同期
   - 対策: 共通マスタ参照、定期同期チェック

3. **セキュリティ**: 個人情報の適切な保護
   - 対策: Firebase Security Rules、アクセスログ

## 今後の拡張可能性

### 短期拡張（3-6ヶ月）
- 電子署名機能
- モバイル対応
- 一括更新機能
- Excel出力対応

### 中期拡張（6-12ヶ月）
- AI による契約書作成支援
- 法改正自動検知・対応提案
- 外部システム連携API
- 多言語対応

### 長期拡張（1年以上）
- ブロックチェーン活用の改ざん防止
- 契約更新予測AI
- 労務管理システムとの統合
- SaaS化・マルチテナント対応

---

**作成日**: 2025-08-06  
**最終更新**: 2025-08-06  
**作成者**: Claude Code Assistant  
**プロジェクト**: 雇用契約書管理システム

## 参考資料
- 労働条件通知書テンプレート（2024年4月新ルール対応版）
- 勤務時間と条件によるマッピングまとめ.csv
- 給与明細システム（CLAUDE.md）の実装ノウハウ