// src/pages/ContractList.js
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc, orderBy } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

function ContractList() {
  const { currentUser, userDetails } = useAuth();
  const [contracts, setContracts] = useState([]);
  const [employees, setEmployees] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'active', 'expiring', 'expired'

  // 契約データと従業員情報を読み込み
  useEffect(() => {
    const fetchContracts = async () => {
      try {
        setLoading(true);
        setError('');
        
        const companyId = userDetails?.companyId;
        if (!companyId) {
          setError("会社情報が取得できません。");
          setLoading(false);
          return;
        }

        console.log("Loading contracts for company:", companyId);
        
        // 契約データを取得
        const contractsQuery = query(
          collection(db, "contracts"),
          where("companyId", "==", companyId),
          orderBy("createdAt", "desc")
        );
        
        const contractsSnapshot = await getDocs(contractsQuery);
        const contractsData = contractsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        console.log("Loaded contracts:", contractsData.length);
        setContracts(contractsData);
        
        // 従業員情報を取得
        const employeesQuery = query(
          collection(db, "employees"),
          where("companyId", "==", companyId)
        );
        
        const employeesSnapshot = await getDocs(employeesQuery);
        const employeesMap = {};
        employeesSnapshot.docs.forEach(doc => {
          const data = doc.data();
          employeesMap[data.employeeId] = data;
        });
        
        setEmployees(employeesMap);
        setLoading(false);
      } catch (error) {
        console.error("契約データ読み込みエラー:", error);
        setError("契約データの取得中にエラーが発生しました");
        setLoading(false);
      }
    };
    
    if (userDetails) {
      fetchContracts();
    }
  }, [userDetails]);

  // 契約ステータスを判定
  const getContractStatus = (contract) => {
    if (!contract.period?.endDate) {
      return { status: 'permanent', label: '無期雇用', color: 'text-green-600' };
    }
    
    const endDate = new Date(contract.period.endDate.seconds * 1000);
    const now = new Date();
    const diffTime = endDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { status: 'expired', label: '期限切れ', color: 'text-red-600' };
    } else if (diffDays <= 30) {
      return { status: 'expiring', label: `${diffDays}日後期限`, color: 'text-yellow-600' };
    } else {
      return { status: 'active', label: '有効', color: 'text-green-600' };
    }
  };

  // フィルタリングされた契約リスト
  const filteredContracts = contracts.filter(contract => {
    if (filter === 'all') return true;
    const statusInfo = getContractStatus(contract);
    return statusInfo.status === filter;
  });

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex justify-center items-center h-32">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">雇用契約書一覧</h1>
        <Link
          to="/admin/contracts/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          新規契約作成
        </Link>
      </div>

      {/* フィルター */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            すべて ({contracts.length})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'active'
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            有効 ({contracts.filter(c => getContractStatus(c).status === 'active').length})
          </button>
          <button
            onClick={() => setFilter('expiring')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'expiring'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            期限間近 ({contracts.filter(c => getContractStatus(c).status === 'expiring').length})
          </button>
          <button
            onClick={() => setFilter('expired')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'expired'
                ? 'bg-red-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            期限切れ ({contracts.filter(c => getContractStatus(c).status === 'expired').length})
          </button>
        </div>
      </div>

      {/* 契約リスト */}
      {filteredContracts.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <p className="text-gray-500 mb-4">
            {filter === 'all' ? '登録されている契約はありません' : `${filter === 'active' ? '有効な' : filter === 'expiring' ? '期限間近の' : '期限切れの'}契約はありません`}
          </p>
          <Link
            to="/admin/contracts/new"
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            新規契約を作成
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  従業員
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  雇用形態
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  契約期間
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ステータス
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  更新日
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredContracts.map((contract) => {
                const employee = employees[contract.employeeId];
                const statusInfo = getContractStatus(contract);
                
                return (
                  <tr key={contract.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {employee ? employee.name : '不明な従業員'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {employee ? employee.employeeId : contract.employeeId}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {contract.employmentType || '未設定'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {contract.period?.type === 'permanent' ? (
                        '期間の定めなし'
                      ) : contract.period?.startDate && contract.period?.endDate ? (
                        `${new Date(contract.period.startDate.seconds * 1000).toLocaleDateString('ja-JP')} ～ ${new Date(contract.period.endDate.seconds * 1000).toLocaleDateString('ja-JP')}`
                      ) : (
                        '未設定'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {contract.updatedAt
                        ? new Date(contract.updatedAt.seconds * 1000).toLocaleDateString('ja-JP')
                        : new Date(contract.createdAt.seconds * 1000).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <Link
                        to={`/admin/contracts/${contract.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        詳細
                      </Link>
                      <Link
                        to={`/admin/contracts/${contract.id}/edit`}
                        className="text-green-600 hover:text-green-900"
                      >
                        編集
                      </Link>
                      <Link
                        to={`/admin/contracts/${contract.id}/print`}
                        className="text-purple-600 hover:text-purple-900"
                      >
                        印刷
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 統計情報 */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-md">
          <div className="text-2xl font-bold text-gray-900">
            {contracts.length}
          </div>
          <div className="text-sm text-gray-500">総契約数</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md">
          <div className="text-2xl font-bold text-green-600">
            {contracts.filter(c => getContractStatus(c).status === 'active' || getContractStatus(c).status === 'permanent').length}
          </div>
          <div className="text-sm text-gray-500">有効契約</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md">
          <div className="text-2xl font-bold text-yellow-600">
            {contracts.filter(c => getContractStatus(c).status === 'expiring').length}
          </div>
          <div className="text-sm text-gray-500">期限間近</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md">
          <div className="text-2xl font-bold text-red-600">
            {contracts.filter(c => getContractStatus(c).status === 'expired').length}
          </div>
          <div className="text-sm text-gray-500">期限切れ</div>
        </div>
      </div>
    </div>
  );
}

export default ContractList;