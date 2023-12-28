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
import { DB } from "lib/db";
import { TransactionWithExtensions } from "lib/model/AllDatabaseDataModel";
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
  const transactionId = parseInt(req.query.id as string);
  const form = req.body as AddTransactionFormValues;
  const db = new DB({ userId });
  const existing = await db.transactionFindFirst(
    Object.assign({ where: { id: transactionId } }, includeExtensions)
  );
  if (!existing) {
    res.status(404).send(`Transaction not found`);
    return;
  }
  if (sameExtension(existing, form)) {
    updateWithSameExtension(form, res, userId, { transactionId });
    return;
  }
  updateAndRecreateExtension(form, existing, res, userId, {
    transactionId,
  });
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

async function updateWithSameExtension(
  form: AddTransactionFormValues,
  res: NextApiResponse<TransactionWithExtensions>,
  userId: number,
  { transactionId }: { transactionId: number }
) {
  const dbArgs: Prisma.TransactionUpdateArgs = Object.assign(
    {
      data: transactionDbInput(form, userId),
      where: { id: transactionId },
    },
    includeExtensions
  );
  const result = await prisma.$transaction(async (tx) => {
    const tripId = await maybeCreateTrip(tx, form, userId);

    if (form.mode == FormMode.PERSONAL) {
      dbArgs.data.personalExpense = {
        update: personalExpenseDbInput(form, userId),
      };
      if (tripId) {
        dbArgs.data.personalExpense.create.tripId = tripId;
      }
    }
    if (form.mode == FormMode.EXTERNAL) {
      dbArgs.data.thirdPartyExpense = {
        update: thirdPartyExpenseDbInput(form, userId),
      };
      if (tripId) {
        dbArgs.data.thirdPartyExpense.create.tripId = tripId;
      }
    }
    if (form.mode == FormMode.TRANSFER) {
      dbArgs.data.transfer = {
        update: transferDbInput(form, userId),
      };
    }
    if (form.mode == FormMode.INCOME) {
      dbArgs.data.income = {
        update: incomeDbInput(form, userId),
      };
    }

    return await tx.transaction.update(dbArgs);
  });
  res.json(result);
}

async function updateAndRecreateExtension(
  form: AddTransactionFormValues,
  existing: TransactionWithExtensions,
  res: NextApiResponse<TransactionWithExtensions>,
  userId: number,
  { transactionId }: { transactionId: number }
) {
  const dbArgs: Prisma.TransactionUpdateArgs = Object.assign(
    {
      data: transactionDbInput(form, userId),
      where: { id: transactionId },
    },
    includeExtensions
  );
  const whereTransactionUser = {
    where: { transactionId, userId },
  };

  const result = await prisma.$transaction(async (tx) => {
    if (existing.personalExpense) {
      await tx.personalExpense.delete(whereTransactionUser);
    }
    if (existing.thirdPartyExpense) {
      await tx.thirdPartyExpense.delete(whereTransactionUser);
    }
    if (existing.transfer) {
      await tx.transfer.delete(whereTransactionUser);
    }
    if (existing.income) {
      await tx.income.delete(whereTransactionUser);
    }

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
    return await tx.transaction.update(dbArgs);
  });

  res.json(result);
}

function sameExtension(
  oldData: TransactionWithExtensions,
  form: AddTransactionFormValues
) {
  return (
    (oldData.personalExpense && form.mode == FormMode.PERSONAL) ||
    (oldData.thirdPartyExpense && form.mode == FormMode.EXTERNAL) ||
    (oldData.income && form.mode == FormMode.INCOME) ||
    (oldData.transfer && form.mode == FormMode.TRANSFER)
  );
}

export default authenticatedApiRoute("POST", handle);
