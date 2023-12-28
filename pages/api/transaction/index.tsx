import { Prisma } from "@prisma/client";
import {
  AddTransactionFormValues,
  FormMode,
  incomeDbInput,
  personalExpenseDbInput,
  thirdPartyExpenseDbInput,
  transactionDbInput,
  transferDbInput,
} from "lib/AddTransactionDataModels";
import { authenticatedApiRoute } from "lib/authenticatedApiRoute";
import prisma from "lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

const includeExtensions = {
  include: {
    personalExpense: true,
    thirdPartyExpense: true,
    transfer: true,
    income: true,
  },
};

async function handle(
  userId: number,
  req: NextApiRequest,
  res: NextApiResponse
) {
  const form = req.body as AddTransactionFormValues;
  const dbArgs: Prisma.TransactionCreateArgs = Object.assign(
    {},
    {
      data: transactionDbInput(form, userId),
    },
    includeExtensions
  );
  const result = await prisma.$transaction(async (tx) => {
    const tripId = await maybeCreateTrip(tx, form, userId);
    if (form.mode == FormMode.PERSONAL) {
      dbArgs.data.personalExpense = {
        create: personalExpenseDbInput(form, userId),
      };
      if (tripId) {
        dbArgs.data.personalExpense.create.tripId = tripId;
      }
    }
    if (form.mode == FormMode.EXTERNAL) {
      dbArgs.data.thirdPartyExpense = {
        create: thirdPartyExpenseDbInput(form, userId),
      };
      if (tripId) {
        dbArgs.data.thirdPartyExpense.create.tripId = tripId;
      }
    }
    if (form.mode == FormMode.TRANSFER) {
      dbArgs.data.transfer = {
        create: transferDbInput(form, userId),
      };
    }
    if (form.mode == FormMode.INCOME) {
      dbArgs.data.income = {
        create: incomeDbInput(form, userId),
      };
    }
    return await tx.transaction.create(dbArgs);
  });
  res.json(result);
}

async function maybeCreateTrip(
  tx,
  form: AddTransactionFormValues,
  userId: number
) {
  if (!form.tripName) {
    return 0;
  }
  const tripNameAndUser = {
    name: form.tripName,
    userId,
  };
  const existingTrip = await tx.trip.findFirst({
    where: tripNameAndUser,
  });
  if (existingTrip) {
    return existingTrip.id;
  }
  const newTrip = await tx.trip.create({
    data: tripNameAndUser,
  });
  return newTrip.id;
}

export default authenticatedApiRoute("POST", handle);
