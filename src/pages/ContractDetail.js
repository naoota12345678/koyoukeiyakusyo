// src/pages/ContractDetail.js
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useParams, Link } from 'react-router-dom';

function ContractDetail() {
  const { id } = useParams();
  const { userDetails } = useAuth();
  const [contract, setContract] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [companySettings, setCompanySettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchContractDetail = async () => {
      try {
        setLoading(true);
        setError('');
        
        if (!id || !userDetails?.companyId) {
          setError("契約IDまたは会社情報が取得できません");
          setLoading(false);
          return;
        }

        // 契約データを取得
        const contractRef = doc(db, "contracts", id);
        const contractSnap = await getDoc(contractRef);
        
        if (!contractSnap.exists()) {
          setError("契約が見つかりません");
          setLoading(false);
          return;
        }
        
        const contractData = contractSnap.data();
        
        // 権限チェック
        if (contractData.companyId !== userDetails.companyId) {
          setError("この契約にアクセスする権限がありません");
          setLoading(false);
          return;
        }
        
        setContract({ id: contractSnap.id, ...contractData });

        // 従業員データを取得
        const employeeRef = doc(db, "employees", contractData.employeeId);
        const employeeSnap = await getDoc(employeeRef);
        
        if (employeeSnap.exists()) {
          setEmployee(employeeSnap.data());
        }

        // 会社設定を取得
        const companySettingsRef = doc(db, "companyEmploymentSettings", userDetails.companyId);
        const companySettingsSnap = await getDoc(companySettingsRef);
        
        if (companySettingsSnap.exists()) {
          setCompanySettings(companySettingsSnap.data());
        }

        setLoading(false);
      } catch (error) {
        console.error("契約詳細取得エラー:", error);
        setError("契約詳細の取得中にエラーが発生しました");
        setLoading(false);
      }
    };

    fetchContractDetail();
  }, [id, userDetails]);

  // 契約ステータスを判定
  const getContractStatus = () => {
    if (!contract?.period?.endDate) {
      return { status: 'permanent', label: '無期雇用', color: 'bg-green-100 text-green-800' };
    }
    
    const endDate = new Date(contract.period.endDate.seconds * 1000);
    const now = new Date();
    const diffTime = endDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { status: 'expired', label: '期限切れ', color: 'bg-red-100 text-red-800' };
    } else if (diffDays <= 30) {
      return { status: 'expiring', label: `${diffDays}日後期限`, color: 'bg-yellow-100 text-yellow-800' };
    } else {
      return { status: 'active', label: '有効', color: 'bg-green-100 text-green-800' };
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex justify-center items-center h-32">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
        <Link
          to="/admin/contracts"
          className="text-blue-600 hover:text-blue-800"
        >
          ← 契約一覧に戻る
        </Link>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-gray-500">契約データがありません</div>
      </div>
    );
  }

  const statusInfo = getContractStatus();

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link
            to="/admin/contracts"
            className="text-blue-600 hover:text-blue-800 text-sm mb-2 inline-block"
          >
            ← 契約一覧に戻る
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">雇用契約書詳細</h1>
        </div>
        
        <div className="space-x-2">
          <Link
            to={`/admin/contracts/${contract.id}/edit`}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
          >
            編集
          </Link>
          <Link
            to={`/admin/contracts/${contract.id}/print`}
            className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
          >
            印刷
          </Link>
        </div>
      </div>

      {/* ステータス表示 */}
      <div className="mb-6">
        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>
          {statusInfo.label}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* メイン情報 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 基本情報 */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-lg font-semibold mb-4">基本情報</h2>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">従業員名</dt>
                <dd className="text-sm text-gray-900">{employee?.name || '不明'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">従業員番号</dt>
                <dd className="text-sm text-gray-900">{contract.employeeId}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">雇用形態</dt>
                <dd className="text-sm text-gray-900">{contract.employmentType || '未設定'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">就業場所</dt>
                <dd className="text-sm text-gray-900">{contract.workplace || '未設定'}</dd>
              </div>
            </dl>
          </div>

          {/* 契約期間 */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-lg font-semibold mb-4">契約期間</h2>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">契約種別</dt>
                <dd className="text-sm text-gray-900">
                  {contract.period?.type === 'permanent' ? '期間の定めなし' : '有期雇用'}
                </dd>
              </div>
              {contract.period?.type === 'fixed-term' && (
                <>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">契約期間</dt>
                    <dd className="text-sm text-gray-900">
                      {contract.period?.startDate && contract.period?.endDate ? (
                        `${new Date(contract.period.startDate.seconds * 1000).toLocaleDateString('ja-JP')} ～ ${new Date(contract.period.endDate.seconds * 1000).toLocaleDateString('ja-JP')}`
                      ) : '未設定'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">更新回数</dt>
                    <dd className="text-sm text-gray-900">
                      {contract.period?.renewalCount || 0} 回
                      {contract.period?.maxRenewals && ` / ${contract.period.maxRenewals} 回まで`}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">更新条件</dt>
                    <dd className="text-sm text-gray-900">
                      {contract.period?.renewalOption || '未設定'}
                    </dd>
                  </div>
                </>
              )}
            </dl>
          </div>

          {/* 勤務時間 */}
          {contract.workingTime && (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-lg font-semibold mb-4">勤務時間</h2>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">就業形態</dt>
                  <dd className="text-sm text-gray-900">{contract.workingTime.pattern || '未設定'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">週所定労働時間</dt>
                  <dd className="text-sm text-gray-900">{contract.workingTime.weeklyHours || '未設定'}時間</dd>
                </div>
                {contract.workingTime.startTime && (
                  <>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">始業時刻</dt>
                      <dd className="text-sm text-gray-900">{contract.workingTime.startTime}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">終業時刻</dt>
                      <dd className="text-sm text-gray-900">{contract.workingTime.endTime}</dd>
                    </div>
                  </>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-500">休憩時間</dt>
                  <dd className="text-sm text-gray-900">{contract.workingTime.breakTime || '未設定'}</dd>
                </div>
              </dl>
            </div>
          )}

          {/* 賃金 */}
          {contract.wage && (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-lg font-semibold mb-4">賃金</h2>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">基本給</dt>
                  <dd className="text-sm text-gray-900">
                    {contract.wage.baseSalary ? `${contract.wage.baseSalary.toLocaleString()}円` : '未設定'}
                  </dd>
                </div>
                {contract.wage.hourlyWage && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">時給</dt>
                    <dd className="text-sm text-gray-900">{contract.wage.hourlyWage}円</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-500">賃金締切日</dt>
                  <dd className="text-sm text-gray-900">{contract.wage.cutoffDate || '未設定'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">賃金支払日</dt>
                  <dd className="text-sm text-gray-900">{contract.wage.paymentDate || '未設定'}</dd>
                </div>
              </dl>
            </div>
          )}

          {/* 福利厚生 */}
          {contract.benefits && (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-lg font-semibold mb-4">社会保険・福利厚生</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center">
                  <span className={`mr-2 w-3 h-3 rounded-full ${contract.benefits.healthInsurance ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                  <span className="text-sm">健康保険</span>
                </div>
                <div className="flex items-center">
                  <span className={`mr-2 w-3 h-3 rounded-full ${contract.benefits.employmentInsurance ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                  <span className="text-sm">雇用保険</span>
                </div>
                <div className="flex items-center">
                  <span className={`mr-2 w-3 h-3 rounded-full ${contract.benefits.pensionInsurance ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                  <span className="text-sm">厚生年金</span>
                </div>
                <div className="flex items-center">
                  <span className={`mr-2 w-3 h-3 rounded-full ${contract.benefits.workersCompensation ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                  <span className="text-sm">労災保険</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* サイドバー */}
        <div className="space-y-6">
          {/* 期限管理 */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4">期限管理</h3>
            {contract.period?.type === 'fixed-term' ? (
              <div className="space-y-3">
                <div className="text-sm">
                  <span className="text-gray-500">契約終了日:</span>
                  <br />
                  <span className="font-medium">
                    {new Date(contract.period.endDate.seconds * 1000).toLocaleDateString('ja-JP')}
                  </span>
                </div>
                {contract.expiryManagement?.alertSettings && (
                  <div className="text-sm">
                    <span className="text-gray-500">通知設定:</span>
                    <ul className="mt-1 space-y-1">
                      {contract.expiryManagement.alertSettings
                        .filter(alert => alert.enabled)
                        .map((alert, index) => (
                          <li key={index} className="text-xs">
                            {alert.days}日前に通知
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-gray-500">
                期間の定めなしのため期限管理はありません
              </div>
            )}
          </div>

          {/* 履歴 */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4">更新履歴</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-500">作成日:</span>
                <br />
                <span className="font-medium">
                  {new Date(contract.createdAt.seconds * 1000).toLocaleDateString('ja-JP')}
                </span>
              </div>
              {contract.updatedAt && (
                <div>
                  <span className="text-gray-500">最終更新:</span>
                  <br />
                  <span className="font-medium">
                    {new Date(contract.updatedAt.seconds * 1000).toLocaleDateString('ja-JP')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* クイックアクション */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4">クイックアクション</h3>
            <div className="space-y-2">
              <Link
                to={`/admin/contracts/${contract.id}/renew`}
                className="block w-full text-center bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
              >
                契約更新
              </Link>
              <Link
                to={`/admin/contracts/${contract.id}/print`}
                className="block w-full text-center bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 text-sm"
              >
                PDF出力
              </Link>
              <Link
                to={`/admin/contracts/${contract.id}/notification`}
                className="block w-full text-center bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 text-sm"
              >
                通知設定
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContractDetail;