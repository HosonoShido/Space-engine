import requests
from bs4 import BeautifulSoup
import re
import pandas as pd
from time import sleep
import numpy as np
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service 
from webdriver_manager.chrome import ChromeDriverManager

def get_race_ids(race_date):
    option=Options()
    option.add_experimental_option('excludeSwitches',['enable-logging']) 
    driver=webdriver.Chrome(options=option)

    url='https://race.netkeiba.com/top/race_list.html?kaisai_date='+str(race_date)
    driver.get(url)

    sleep(1)

    karenda=driver.find_element(By.XPATH,'//*[@id="RaceTopRace"]')

    a_list=karenda.find_elements(By.TAG_NAME,'a')

    url_list=[]
    for a in a_list:
        url=a.get_attribute("href")
        if "https://race.netkeiba.com/top/payback_list.html?kaisai_id" not in url:
            if "movie" not in url:
                url_list.append(url)

    race_ids=[]
    for i in url_list:
        race_ids.append(i.split("=")[1].split("&")[0])

    #for i in race_ids:
    #   print(i)

    #df_race_id=pd.DataFrame({"raceid":race_ids})
    #print(df_race_id)

    driver.close()

race_ids=[]
for race_date in race_dates:
    race_ids.extend(get_race_ids(race_date))
      
