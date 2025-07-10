// components/CommentBox.js
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function CommentBox({ targetType, targetId }) {
  const [comments, setComments] = useState([]);
  const [username, setUsername] = useState('');
  const [text, setText] = useState('');

  useEffect(() => {
    if (targetId && targetType) fetchComments();
  }, [targetId, targetType]);

  async function fetchComments() {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .order('created_at', { ascending: false });

    if (data) setComments(data);
  }

  async function submitComment() {
    if (!username || !text) return;

    const { data, error } = await supabase.from('comments').insert([
      {
        username,
        text,
        target_type: targetType,
        target_id: targetId,
      },
    ]);

    if (!error) {
      setText('');
      fetchComments();
    }
  }

  if (!targetId || !targetType) return null;

  return (
    <div style={{ marginTop: '1em' }}>
      <h3>💬 コメント</h3>
      <input
        placeholder="名前"
        value={username}
        onChange={e => setUsername(e.target.value)}
        style={{ width: '100%', marginBottom: '0.5em' }}
      />
      <textarea
        placeholder="コメント内容"
        value={text}
        onChange={e => setText(e.target.value)}
        style={{ width: '100%', height: '60px', marginBottom: '0.5em' }}
      />
      <button onClick={submitComment} style={{ width: '100%' }}>送信</button>

      <ul style={{ marginTop: '1em', paddingLeft: 0, listStyle: 'none' }}>
        {comments.map(c => (
          <li key={c.id} style={{ marginBottom: '0.5em', borderBottom: '1px solid #ccc' }}>
            <strong>{c.username} {new Date(c.created_at).toLocaleString("ja-JP")}</strong><br />
            {c.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
