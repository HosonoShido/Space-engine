import requests
from bs4 import BeautifulSoup
import pandas as pd
import numpy as np
import csv

#def get_race_result_html(race_id):
 #   url="https://db.netkeiba.com/race/"+str(race_id)
  #  html=requests.get(url)#,encoding="UTF-8")
   # return(html)

#レース結果を取得する関数
def get_race_record(race_id):
    url="https://db.netkeiba.com/race/"+str(race_id)
    html=requests.get(url)
    #netkeibaの文字コードはeuc-jp
    record_df=pd.read_html(url,encoding="euc-jp")[0]
    record_df["性別"]=record_df["性齢"].str.split("",expand=True)[1]
    record_df["年齢"]=record_df["性齢"].str.split("",expand=True)[2]
    minutes=record_df["タイム"].str.split(":",expand=True)[0]
    second=record_df["タイム"].str.split(":",expand=True)[1]
    #データフレーム内の要素の型を一括で変換するならastype()
    record_df["タイム(秒)"]=minutes.astype(int)*60+second.astype(float)
    record_df["馬体重(今)"]=record_df["馬体重"].str.split("(",expand=True)[0]
    record_df["race_id"]=race_id
    record_df["ﾀｲﾑ 指数"]=None
    record_df["年齢"]=record_df["年齢"].astype(int)

    record_df=record_df.reindex(columns=["race_id","着 順","枠 番","馬 番","馬名","性齢","性別","年齢","斤量","騎手","タイム","タイム(秒)","着差","ﾀｲﾑ 指数","通過","上り","単勝","人 気","馬体重","馬体重(今)","調教 ﾀｲﾑ","厩舎 ｺﾒﾝﾄ","備考","調教師","馬主","賞金 (万円)"])

    return record_df
    
get_race_record(202106030702).to_csv("record.csv",index=False)
#get_race_record(202109020909)
#get_race_record(202109020907)
#get_race_record(202106030708)
#get_race_record(race_id)