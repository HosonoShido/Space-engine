import { useState , useEffect } from 'react';
import Link from 'next/link';
import CommentSection from '../components/CommentBox';

export default function Food() {
  const initialData=[
    {name:"焼肉", key:"Dgood"},
    {name:"回鍋肉", key:"Egood"},
    {name:"ハンバーガー", key:"Fgood"},
    {name:"ピザ", key:"Ggood"},
  ]

  const [parties,setParties]=useState(initialData);

  useEffect(()=>{
    const updated = parties.map(party=>{
      const saved = localStorage.getItem(party.key);
      return{...party, count:saved!==null ? parseInt(saved) : 0};
        //?を使ってifとelseまとめてかける。parseInt(saved)がif。0がelse
        //parseIntは文字列を数値にする
    });
    updated.sort((a,b)=>b.count-a.count);     //降順に並べる
    setParties(updated);
  },[]);  //[]は依存配列。中身が空だと初回だけこの関数実行される。

  function vote(key){
    const updated = parties.map(party=>{
      if (party.key===key){
        const newcount = party.count+1
        localStorage.setItem(key,newcount);
        return {...party, count:newcount};
      }
      else{
        return party;
      }
    });
    updated.sort((a,b)=>b.count-a.count);
    setParties(updated);
  }

  return (
    <div>
      <h1>人気料理ランキング</h1> 
      <ul>
        {parties.map(party=>(
          <li key={party.key}> {/*このkeyはreact向けで開発者には関係ない*/}
            <button onClick={() => vote(party.key)}> {/*関数は()がついてると即実行されてしまうので、アロー関数を定義する。という形で即実行されないようにしている*/}
              {party.name}は{party.count}👍
            </button>
          </li>
        ))}
      </ul>
      <CommentSection storageKey="comments-food" />
    </div>
  );
}
