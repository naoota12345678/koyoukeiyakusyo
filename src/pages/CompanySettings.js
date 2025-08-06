// src/pages/CompanySettings.js
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, doc, getDoc, setDoc, getDocs, deleteDoc, query, where, updateDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

function CompanySettings() {
  const { currentUser, userDetails } = useAuth();
  const [companyInfo, setCompanyInfo] = useState({
    name: '',
    address: '',
    phone: '',
    taxId: '',
    companyNumber: ''
  });
  const [departments, setDepartments] = useState([]);
  const [newDepartment, setNewDepartment] = useState({ 
    code: '', 
    name: '' 
  });
  
  // 雇用契約用会社設定
  const [employmentSettings, setEmploymentSettings] = useState({
    // 基本情報
    ceoName: '',
    employeeCount: 0,
    
    // 就業規則
    workRegulations: {
      storageLocation: '',
      confirmationMethod: '書面の交付'
    },
    
    // 定年制
    retirement: {
      hasRetirement: true,
      retirementAge: 60,
      hasRehire: true,
      rehireMaxAge: 65
    },
    
    // 退職
    resignation: {
      noticePeriod: 30,
      procedure: '退職する30日前までに届け出ること'
    },
    
    // 休日
    holidays: {
      regularDays: ['日曜日'],
      irregularDays: '会社カレンダーによる',
      flexibleScheduling: false
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('company'); // 'company', 'departments', or 'employment'

  // 会社情報と部門データを読み込む
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');
        
        const companyId = userDetails?.companyId;
        if (!companyId) {
          console.error("Company ID not available", userDetails);
          setError("会社情報が取得できません。設定を確認してください。");
          setLoading(false);
          return;
        }

        console.log("Loading data for company:", companyId);
        
        // 会社情報を取得
        const companyDocRef = doc(db, "companies", companyId);
        const companyDocSnap = await getDoc(companyDocRef);
        
        if (companyDocSnap.exists()) {
          setCompanyInfo(companyDocSnap.data());
        } else {
          console.log("No company document found");
        }
        
        // 雇用契約用会社設定を取得
        const employmentSettingsRef = doc(db, "companyEmploymentSettings", companyId);
        const employmentSettingsSnap = await getDoc(employmentSettingsRef);
        
        if (employmentSettingsSnap.exists()) {
          setEmploymentSettings(prev => ({
            ...prev,
            ...employmentSettingsSnap.data()
          }));
        } else {
          console.log("No employment settings found, using defaults");
        }
        
        // 部門データを取得
        const departmentsQuery = query(
          collection(db, "departments"),
          where("companyId", "==", companyId)
        );
        
        const departmentsSnapshot = await getDocs(departmentsQuery);
        const departmentsData = departmentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log("Loaded departments:", departmentsData.length);
        setDepartments(departmentsData);
        
        setLoading(false);
      } catch (error) {
        console.error("データ読み込みエラー:", error);
        setError("データの取得中にエラーが発生しました");
        setLoading(false);
      }
    };
    
    if (userDetails) {
      fetchData();
    }
  }, [userDetails]);

  // 会社番号自動生成関数
  const generateCompanyNumber = async () => {
    try {
      // 既存の会社番号を取得して最大値を確認
      const companiesSnapshot = await getDocs(collection(db, "companies"));
      const existingNumbers = [];
      
      companiesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.companyNumber) {
          // COMP0001 形式から数値部分を抽出
          const match = data.companyNumber.match(/^COMP(\d{4})$/);
          if (match) {
            existingNumbers.push(parseInt(match[1]));
          }
        }
      });
      
      // 次の番号を決定（最大値+1、または1から開始）
      const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
      
      // 4桁でゼロパディング
      return `COMP${nextNumber.toString().padStart(4, '0')}`;
    } catch (error) {
      console.error('会社番号生成エラー:', error);
      // エラーの場合はランダムな番号を生成
      const randomNum = Math.floor(Math.random() * 9000) + 1000;
      return `COMP${randomNum}`;
    }
  };

  // 会社情報を保存
  const saveCompanyInfo = async () => {
    try {
      const companyId = userDetails?.companyId;
      if (!companyId) {
        setError("会社情報が取得できません");
        return;
      }
      
      console.log("=== 会社情報保存デバッグ ===");
      console.log("companyId:", companyId);
      console.log("認証UID:", currentUser?.uid);
      console.log("userDetails:", userDetails);
      console.log("companyInfo:", companyInfo);
      console.log("========================");
      
      // 必須項目のチェック
      if (!companyInfo.name) {
        setError("会社名を入力してください");
        return;
      }

      // 会社番号が未設定の場合は自動生成
      let updatedCompanyInfo = { ...companyInfo };
      if (!companyInfo.companyNumber) {
        console.log('🔧 会社番号を自動生成中...');
        const newCompanyNumber = await generateCompanyNumber();
        updatedCompanyInfo.companyNumber = newCompanyNumber;
        
        // UIも更新
        setCompanyInfo(prev => ({
          ...prev,
          companyNumber: newCompanyNumber
        }));
        
        console.log('✅ 会社番号生成完了:', newCompanyNumber);
      }
      
      const companyDocRef = doc(db, "companies", companyId);
      
      // setDocを使用して新規作成または更新（merge: trueで既存データは保持）
      await setDoc(companyDocRef, {
        ...updatedCompanyInfo,
        updatedAt: new Date(),
        createdAt: new Date() // 新規作成時のみ使用される
      }, { merge: true });
      
      setSuccess("会社情報を保存しました" + (updatedCompanyInfo.companyNumber !== companyInfo.companyNumber ? ` (会社番号: ${updatedCompanyInfo.companyNumber})` : ""));
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error("会社情報保存エラー:", error);
      console.error("エラーコード:", error.code);
      console.error("エラーメッセージ:", error.message);
      setError(`会社情報の保存中にエラーが発生しました: ${error.message}`);
    }
  };
  
  // 雇用契約用設定を保存
  const saveEmploymentSettings = async () => {
    try {
      const companyId = userDetails?.companyId;
      if (!companyId) {
        setError("会社情報が取得できません");
        return;
      }
      
      console.log("=== 雇用契約設定保存デバッグ ===");
      console.log("companyId:", companyId);
      console.log("employmentSettings:", employmentSettings);
      console.log("==========================");
      
      // 必須項目のチェック
      if (!employmentSettings.ceoName) {
        setError("代表取締役名を入力してください");
        return;
      }
      
      const employmentSettingsRef = doc(db, "companyEmploymentSettings", companyId);
      
      await setDoc(employmentSettingsRef, {
        ...employmentSettings,
        companyId: companyId,
        updatedAt: new Date(),
        createdAt: new Date() // 新規作成時のみ使用される
      }, { merge: true });
      
      setSuccess("雇用契約設定を保存しました");
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error("雇用契約設定保存エラー:", error);
      setError(`雇用契約設定の保存中にエラーが発生しました: ${error.message}`);
    }
  };

  // 新しい部門を追加
  const addDepartment = async () => {
    try {
      const companyId = userDetails?.companyId;
      if (!companyId) {
        setError("会社情報が取得できないため、部門を追加できません。");
        return;
      }

      if (!newDepartment.code.trim() || !newDepartment.name.trim()) {
        setError("部門コードと部門名を入力してください。");
        return;
      }
      
      // 部門コードの重複チェック
      const existingDept = departments.find(dept => dept.code === newDepartment.code);
      if (existingDept) {
        setError("この部門コードは既に使用されています。");
        return;
      }

      const newDepartmentRef = doc(collection(db, "departments"));
      
      const departmentData = {
        ...newDepartment,
        companyId: companyId,
        createdAt: new Date()
      };
      
      await setDoc(newDepartmentRef, departmentData);
      
      setDepartments([...departments, { id: newDepartmentRef.id, ...departmentData }]);
      // 入力フォームをリセット
      setNewDepartment({ code: '', name: '' });
      setSuccess("部門を追加しました");
      setError('');
    } catch (error) {
      console.error("部門追加エラー:", error);
      setError("部門の追加中にエラーが発生しました。");
    }
  };

  // 部門を削除
  const deleteDepartment = async (id) => {
    if (!window.confirm("この部門を削除しますか？\n※この部門に所属する従業員がいる場合、部門情報が正しく表示されなくなります。")) {
      return;
    }
    
    try {
      await deleteDoc(doc(db, "departments", id));
      setDepartments(departments.filter(dept => dept.id !== id));
      setSuccess("部門を削除しました");
    } catch (error) {
      console.error("部門削除エラー:", error);
      setError("部門の削除中にエラーが発生しました。");
    }
  };

  if (loading) {
    return <div className="text-center p-8">読み込み中...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">会社設定</h1>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
          <p>{error}</p>
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6">
          <p>{success}</p>
        </div>
      )}
      
      {/* タブ切り替え */}
      <div className="flex border-b mb-6">
        <button
          className={`px-4 py-2 font-medium text-sm mr-2 ${
            activeTab === 'company'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('company')}
        >
          会社情報
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm mr-2 ${
            activeTab === 'departments'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('departments')}
        >
          部門管理
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm mr-2 ${
            activeTab === 'employment'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('employment')}
        >
          雇用契約設定
        </button>
      </div>
      
      {/* 会社情報タブ */}
      {activeTab === 'company' && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">会社情報設定</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                会社名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={companyInfo.name || ''}
                onChange={(e) => setCompanyInfo({...companyInfo, name: e.target.value})}
                className="w-full border rounded-md px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                会社番号
              </label>
              <input
                type="text"
                value={companyInfo.companyNumber || '未設定（保存時に自動生成）'}
                readOnly
                className="w-full bg-gray-100 border rounded-md px-3 py-2 text-gray-600 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">
                会社番号は保存時に自動生成されます（例: COMP0001）
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                住所
              </label>
              <input
                type="text"
                value={companyInfo.address || ''}
                onChange={(e) => setCompanyInfo({...companyInfo, address: e.target.value})}
                className="w-full border rounded-md px-3 py-2"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                電話番号
              </label>
              <input
                type="text"
                value={companyInfo.phone || ''}
                onChange={(e) => setCompanyInfo({...companyInfo, phone: e.target.value})}
                className="w-full border rounded-md px-3 py-2"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                法人番号
              </label>
              <input
                type="text"
                value={companyInfo.taxId || ''}
                onChange={(e) => setCompanyInfo({...companyInfo, taxId: e.target.value})}
                className="w-full border rounded-md px-3 py-2"
              />
            </div>
          </div>
          
          <button
            onClick={saveCompanyInfo}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            保存
          </button>
        </div>
      )}
      
      {/* 部門管理タブ */}
      {activeTab === 'departments' && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">部門管理</h2>
          
          {/* 新規部門追加フォーム */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                部門コード <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newDepartment.code}
                onChange={(e) => setNewDepartment({...newDepartment, code: e.target.value})}
                placeholder="例: DEPT001"
                className="w-full border rounded-md px-3 py-2"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                部門名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newDepartment.name}
                onChange={(e) => setNewDepartment({...newDepartment, name: e.target.value})}
                placeholder="例: 営業部"
                className="w-full border rounded-md px-3 py-2"
              />
            </div>
            
            <div className="flex items-end">
              <button
                onClick={addDepartment}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
              >
                部門を追加
              </button>
            </div>
          </div>
          
          {/* 部門リスト */}
          {departments.length === 0 ? (
            <p className="text-gray-500 italic">登録されている部門はありません</p>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    部門コード
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    部門名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {departments.map((dept) => (
                  <tr key={dept.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {dept.code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {dept.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => deleteDepartment(dept.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          
          {/* 注意事項 */}
          <div className="bg-yellow-50 p-4 rounded-md mt-6 border border-yellow-200">
            <h3 className="text-sm font-medium text-yellow-800 mb-2">部門管理に関する注意事項</h3>
            <ul className="text-xs text-yellow-700 space-y-1 list-disc pl-5">
              <li>部門コードは社内で一意の値を設定してください</li>
              <li>CSVからのインポート時に部門コードで紐付けが行われます</li>
              <li>部門を削除すると、所属していた従業員の部門情報が正しく表示されなくなります</li>
            </ul>
          </div>
        </div>
      )}
      
      {/* 雇用契約設定タブ */}
      {activeTab === 'employment' && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">雇用契約書用会社設定</h2>
          
          <div className="space-y-8">
            {/* 基本情報セクション */}
            <div className="border-b pb-6">
              <h3 className="text-lg font-medium mb-4">基本情報</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    代表取締役名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={employmentSettings.ceoName || ''}
                    onChange={(e) => setEmploymentSettings({
                      ...employmentSettings,
                      ceoName: e.target.value
                    })}
                    placeholder="例: 田中 太郎"
                    className="w-full border rounded-md px-3 py-2"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    従業員数
                  </label>
                  <input
                    type="number"
                    value={employmentSettings.employeeCount || ''}
                    onChange={(e) => setEmploymentSettings({
                      ...employmentSettings,
                      employeeCount: parseInt(e.target.value) || 0
                    })}
                    placeholder="例: 50"
                    className="w-full border rounded-md px-3 py-2"
                  />
                </div>
              </div>
            </div>

            {/* 就業規則セクション */}
            <div className="border-b pb-6">
              <h3 className="text-lg font-medium mb-4">就業規則</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    就業規則の保管場所
                  </label>
                  <input
                    type="text"
                    value={employmentSettings.workRegulations?.storageLocation || ''}
                    onChange={(e) => setEmploymentSettings({
                      ...employmentSettings,
                      workRegulations: {
                        ...employmentSettings.workRegulations,
                        storageLocation: e.target.value
                      }
                    })}
                    placeholder="例: 本社総務部"
                    className="w-full border rounded-md px-3 py-2"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    就業規則の周知方法
                  </label>
                  <select
                    value={employmentSettings.workRegulations?.confirmationMethod || '書面の交付'}
                    onChange={(e) => setEmploymentSettings({
                      ...employmentSettings,
                      workRegulations: {
                        ...employmentSettings.workRegulations,
                        confirmationMethod: e.target.value
                      }
                    })}
                    className="w-full border rounded-md px-3 py-2"
                  >
                    <option value="書面の交付">書面の交付</option>
                    <option value="電子メールの送信">電子メールの送信</option>
                    <option value="ホームページへの掲載">ホームページへの掲載</option>
                    <option value="事業所への掲示">事業所への掲示</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 定年制セクション */}
            <div className="border-b pb-6">
              <h3 className="text-lg font-medium mb-4">定年制</h3>
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="hasRetirement"
                    checked={employmentSettings.retirement?.hasRetirement || false}
                    onChange={(e) => setEmploymentSettings({
                      ...employmentSettings,
                      retirement: {
                        ...employmentSettings.retirement,
                        hasRetirement: e.target.checked
                      }
                    })}
                    className="mr-2"
                  />
                  <label htmlFor="hasRetirement" className="text-sm font-medium text-gray-700">
                    定年制度あり
                  </label>
                </div>
                
                {employmentSettings.retirement?.hasRetirement && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        定年年齢
                      </label>
                      <input
                        type="number"
                        value={employmentSettings.retirement?.retirementAge || 60}
                        onChange={(e) => setEmploymentSettings({
                          ...employmentSettings,
                          retirement: {
                            ...employmentSettings.retirement,
                            retirementAge: parseInt(e.target.value) || 60
                          }
                        })}
                        className="w-full border rounded-md px-3 py-2"
                      />
                    </div>
                    
                    <div>
                      <div className="flex items-center mb-2">
                        <input
                          type="checkbox"
                          id="hasRehire"
                          checked={employmentSettings.retirement?.hasRehire || false}
                          onChange={(e) => setEmploymentSettings({
                            ...employmentSettings,
                            retirement: {
                              ...employmentSettings.retirement,
                              hasRehire: e.target.checked
                            }
                          })}
                          className="mr-2"
                        />
                        <label htmlFor="hasRehire" className="text-sm font-medium text-gray-700">
                          再雇用制度あり
                        </label>
                      </div>
                      
                      {employmentSettings.retirement?.hasRehire && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            再雇用上限年齢
                          </label>
                          <input
                            type="number"
                            value={employmentSettings.retirement?.rehireMaxAge || 65}
                            onChange={(e) => setEmploymentSettings({
                              ...employmentSettings,
                              retirement: {
                                ...employmentSettings.retirement,
                                rehireMaxAge: parseInt(e.target.value) || 65
                              }
                            })}
                            className="w-full border rounded-md px-3 py-2"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 退職セクション */}
            <div className="border-b pb-6">
              <h3 className="text-lg font-medium mb-4">退職</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    退職予告期間（日数）
                  </label>
                  <input
                    type="number"
                    value={employmentSettings.resignation?.noticePeriod || 30}
                    onChange={(e) => setEmploymentSettings({
                      ...employmentSettings,
                      resignation: {
                        ...employmentSettings.resignation,
                        noticePeriod: parseInt(e.target.value) || 30
                      }
                    })}
                    className="w-full border rounded-md px-3 py-2"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    退職手続き
                  </label>
                  <input
                    type="text"
                    value={employmentSettings.resignation?.procedure || ''}
                    onChange={(e) => setEmploymentSettings({
                      ...employmentSettings,
                      resignation: {
                        ...employmentSettings.resignation,
                        procedure: e.target.value
                      }
                    })}
                    placeholder="例: 退職する30日前までに届け出ること"
                    className="w-full border rounded-md px-3 py-2"
                  />
                </div>
              </div>
            </div>

            {/* 休日セクション */}
            <div>
              <h3 className="text-lg font-medium mb-4">休日</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    定例日
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'].map((day) => (
                      <label key={day} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={employmentSettings.holidays?.regularDays?.includes(day) || false}
                          onChange={(e) => {
                            const regularDays = employmentSettings.holidays?.regularDays || [];
                            let newRegularDays;
                            if (e.target.checked) {
                              newRegularDays = [...regularDays, day];
                            } else {
                              newRegularDays = regularDays.filter(d => d !== day);
                            }
                            setEmploymentSettings({
                              ...employmentSettings,
                              holidays: {
                                ...employmentSettings.holidays,
                                regularDays: newRegularDays
                              }
                            });
                          }}
                          className="mr-1"
                        />
                        <span className="text-sm">{day}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    非定例日
                  </label>
                  <input
                    type="text"
                    value={employmentSettings.holidays?.irregularDays || ''}
                    onChange={(e) => setEmploymentSettings({
                      ...employmentSettings,
                      holidays: {
                        ...employmentSettings.holidays,
                        irregularDays: e.target.value
                      }
                    })}
                    placeholder="例: 会社カレンダーによる"
                    className="w-full border rounded-md px-3 py-2"
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 flex justify-between">
            <button
              onClick={saveEmploymentSettings}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
            >
              保存
            </button>
            
            <div className="text-sm text-gray-500">
              ※ これらの設定は雇用契約書作成時のデフォルト値として使用されます
            </div>
          </div>
          
          {/* 注意事項 */}
          <div className="bg-blue-50 p-4 rounded-md mt-6 border border-blue-200">
            <h3 className="text-sm font-medium text-blue-800 mb-2">雇用契約設定について</h3>
            <ul className="text-xs text-blue-700 space-y-1 list-disc pl-5">
              <li>これらの設定は新規雇用契約作成時のデフォルト値となります</li>
              <li>個別の契約では項目ごとに設定を上書きできます</li>
              <li>2024年4月労働基準法改正に対応した項目設定です</li>
              <li>法改正等により項目が追加される場合があります</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default CompanySettings;