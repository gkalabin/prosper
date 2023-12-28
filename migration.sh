#!/bin/bash

cd /opt/prosper
npx prisma db push
sudo mysql prosperdb -e 'select t.id from PersonalExpense e join Transaction t on e.transactionId=t.id where ownShareAmountCents != amountCents and t.userId=1' | grep -v id | sudo xargs -I {} mysql prosperdb -e 'update PersonalExpense set otherPartyName="Kristina" where transactionId={}'
sudo mysql prosperdb -e 'select t.id from PersonalExpense e join Transaction t on e.transactionId=t.id where ownShareAmountCents != amountCents and t.userId=2' | grep -v id | sudo xargs -I {} mysql prosperdb -e 'update PersonalExpense set otherPartyName="Grishka" where transactionId={}'
sudo mysql prosperdb -e 'update Income set payer=vendor'