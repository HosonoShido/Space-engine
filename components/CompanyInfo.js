// components/CompanyInfo.js
import React from 'react';
import countryCodeToEmoji from './countryCodeToEmoji.js'; // 必要に応じて共通関数を分ける
import CommentBox from './comment.js'; // コメントボックスコンポーネントをインポート

export default function CompanyInfo({ company }) {
  if (!company) return null;

  return (
    <div style={{
      position: 'absolute',
      top: '20%',
      right: '20px',
      left: '20px',
      transform: 'translateY(-50%)',
      backgroundColor: 'white',
      color: 'green',
      padding: '1em',
      borderRadius: '30px',
      maxWidth: '300px',
      boxShadow: '0 0 20px white',
      zIndex: 1000
    }}>
      <h2>{company.name} {countryCodeToEmoji(company.flag_code)}</h2>
      <p>{company.description}</p>
      <CommentBox targetType="company" targetId={company.name} />
    </div>
  );
}
