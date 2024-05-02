import requests
from bs4 import BeautifulSoup
import pandas as pd
import numpy as np
import csv

#払い戻し情報を取得する関数
def get_drawback(race_id):
    url="https://db.netkeiba.com/race/"+str(race_id)
    html=requests.get(url)
    #netkeibaの文字コードはeuc-jp
    record_df=pd.read_html(url,encoding="euc-jp")
    drawback_df=pd.concat([record_df[1],record_df[2]]).reset_index(drop=True)
    fuku=str(drawback_df[1:2])
    fuku=fuku.split("複勝")[1]
    fuku=fuku.split(" ")
    fukufuku=[]
    for i in fuku:
        if i!="":
            fukufuku.append(i)
    for i in range(1,4):
        drawback_df.loc[i+7]=["複勝",fukufuku[i-1],fukufuku[i+2],fukufuku[i+5]] 

    wide=str(drawback_df[4:5])
    wide=wide.replace("\\n","*")
    wide=wide.split("ワイド")[1]
    wide=wide.split(" ")
    wiwi=[]
    for i in wide:
        if i!="":
            wiwi.append(i)
    for i in range(0,3):
        drawback_df.loc[i+11]=["ワイド",''.join(wiwi[i*3:i*3+3]),wiwi[i+9],wiwi[i+12]]     
    data=drawback_df.loc[0:0],drawback_df.loc[8:10],drawback_df.loc[2:3],drawback_df.loc[11:13],drawback_df.loc[5:7]
    drawback_df_nakaya=pd.concat(data).reset_index(drop=True)
    drawback_df_nakaya["4"]=race_id
    new_colmns=["種別","組合せ","払戻金","人気","race_id"]
    drawback_df_nakaya.columns=new_colmns
    drawback_df_nakaya=drawback_df_nakaya.reindex(["race_id","種別","組合せ","払戻金","人気"],axis="columns")

    print(drawback_df_nakaya)
    return(drawback_df_nakaya)

get_drawback(202106030702).to_csv("drawback.csv",index=False)
#get_race_record(202109020909)
#get_race_record(202109020907)
#get_race_record(202106030708)
#get_race_record(race_id)