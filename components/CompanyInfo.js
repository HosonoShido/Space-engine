// components/CompanyInfo.js
import React from 'react';
import countryCodeToEmoji from './countryCodeToEmoji.js';
import CommentBox from './comment.js';

export default function CompanyInfo({ company, onClose }) {
  if (!company) return null;

  return (
    <div
      // パネル見た目のみ。位置は親側で制御
      style={{
        position: 'relative',        // ×ボタンを絶対配置するため
        backgroundColor: 'black',
        color: 'white',
        padding: '16px 16px 16px 16px',
        borderRadius: '30px',
        maxWidth: '300px',
        boxShadow: '0 0 20px white',
        zIndex: 1000
      }}
    >
      {/* 右上の × ボタン */}
      <button
        type="button"
        aria-label="閉じる"
        data-no-drag                     // ドラッグ対象から除外したい場合に使えるフラグ
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          if (onClose) onClose();
        }}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          width: 28,
          height: 28,
          borderRadius: 14,
          border: '1px solid rgba(255,255,255,0.6)',
          background: 'rgba(255,255,255,0.08)',
          color: 'white',
          fontSize: 18,
          lineHeight: '26px',
          textAlign: 'center',
          cursor: 'pointer',
          padding: 0
        }}
        title="閉じる"
      >
        ×
      </button>

      <h2 style={{ margin: '0 0 8px 0' }}>
        {company.name} {countryCodeToEmoji(company.flag_code)}
      </h2>
      <p style={{ margin: '0 0 12px 0' }}>{company.description}</p>

      <CommentBox targetType="company" targetId={company.name} />
    </div>
  );
}
