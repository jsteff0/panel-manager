import { GetServerSidePropsContext, NextApiRequest } from "next";
import { verifyToken, getTokenFromReq } from "@/lib/jwt";
import { useState } from "react";
import Link from "next/link";
import path from "path";
import fs from "fs/promises";
import Modal from "@/components/Modal";
import { useEffect, useRef } from 'react';

type Roles = {
	[roleName: string]: string[];
};


export default function Panel({ loggedIn, role, permissions, roles, listPermissions, usrLogin }: { loggedIn: boolean, role: string, permissions: string[], roles: Roles, listPermissions: string[], usrLogin: string }) {
	const [abortController, setAbortController] = useState<AbortController | null>(null);
	const [addRoleModalSwitcher, setAddRoleModalSwitcher] = useState(false);
	const [deleteRoleModalSwitcher, setDeleteRoleModalSwitcher] = useState(false);
	const [access, setAccess] = useState(loggedIn);
	const [form, setForm] = useState({ login: "", password: "" });
	const [error, setError] = useState("");
	const [teamName, setTeamName] = useState("");
	const [login, setLogin] = useState("");
	const [usrRole, setUsrRole] = useState("manager");
	const [loginStatus, setLoginStatus] = useState<{ text: string; color: string }>({ text: '', color: '' });
	const [password, setPassword] = useState("");
	const [visablePass, setVisabilityPass] = useState<"password" | "text">("password");
	const [ipStr, setIPs] = useState("");
	const [userBtnStatus, setUserBtnStatus] = useState<{ text: string; state: boolean }>({ text: 'Добавить', state: true });
	const [participant1, setParticipant1] = useState("");
	const [participant2, setParticipant2] = useState("");
	const [by, setBy] = useState<'team' | 'nick'>('team');
	const [action, setAction] = useState<'user' | 'IP' | 'delete' | 'edit-role' | 'edit-password'>('user');
	const [value, setValue] = useState('');
	const [delta, setDelta] = useState(0);
	const [teamToDelete, setTeamToDelete] = useState("");
	const [msg, setMsg] = useState("");
	const [editRole, setEditRole] = useState("");
	const [deleteRole, setDeleteRole] = useState("");
	const [allRoles, setAllRoles] = useState(roles);
	const [roleName, setRoleName] = useState("");
	const [roleNameBtnStatus, setRoleNameBtnStatus] = useState<{ text: string; state: boolean }>({ text: 'Добавить', state: true });
	const [roleNameStatus, setRoleNameStatus] = useState<{ text: string; color: string }>({ text: '', color: '' });
	const [remainingPermissions, setRemainingPermissions] = useState<string[]>([]);
	const [initialRoles, setInitialRoles] = useState(roles);
	const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

	const hasChanges = JSON.stringify(initialRoles) !== JSON.stringify(allRoles);
	const count = 5;	//global waiting time(in seconds) to execute an action again 

	const socketRef = useRef<WebSocket | null>(null);
	useEffect(() => {
		if (!usrLogin) return;
		// TODO: Удалить перед продом — временно активирует сервер
		fetch('/api/auth/connect');

		const socket = new WebSocket(`ws://${window.location.host}/ws?login=${usrLogin}`);
		socketRef.current = socket;
		socket.onopen = () => {
			console.log("🔗 WS соединение установлено");
			socket.send('getOnlineUsers');
		};

		socket.onmessage = (e) => {
			try {
				const data = JSON.parse(e.data);
				if (data.onlineUsers) {
					setOnlineUsers(data.onlineUsers);
				}
			} catch {
				console.log('Неправильный формат данных', e.data);
			}
		};

		socket.onclose = () => {
			console.log("❌ Соединение закрыто");
		};

		return () => {
			socketRef.current?.close();
			socketRef.current = null;
		};
	}, [usrLogin]);



	const handleSubmit = async (e: React.FormEvent) => { // Вход в панель управления
		e.preventDefault();
		const res = await fetch("/api/auth/panel-auth", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(form),
		});
		const data = await res.json();
		if (data.success) {
			setAccess(true)
			location.reload();
		} else setError("Неверные данные");
	};

	async function changePoints( // Пример изменения очков для какой нибудь команды в БД. Можно использовать как управление ценами
		by: "team" | "nick",
		value: string,
		delta: number
	) {
		const res = await fetch("/api/private/update-db", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ by, value, delta }),
		});
		const data = await res.json();
		if (res.ok) return data;
		return res.statusText
	}
	const handleSubmitUpdate = async (e: React.FormEvent) => { // Вызов обновления очков
		e.preventDefault();
		const res = await changePoints(by, value, delta);
		setMsg(res.team
			? `✅ ${res.team.teamname} сейчас имеет ${res.team.points} очков`
			: `❌ ${res.message}`);
		if (!res.team) console.log(res.error)
	};


	const handleSubmitDelete = async () => { // Пример удаления команды в БД. Можно использовать как удаление какого то товара 
		const res = await fetch("/api/private/delete-db", {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ teamName: teamToDelete }),
		});
		const data = await res.json();
		setMsg(res.ok
			? `✅ Удалена команда ${data.deleted}`
			: `❌ ${data.message}`);
		if (!res.ok) console.log(data.error)
	};

	const handleDownload = async () => {	// Пример скачивания файлов в zip архиве(можно изменить на один файл). Можно испольковать как скачивание каких нибудь отчетов
		const teams = await fetch("/api/data").then((r) => r.json());

		const res = await fetch("/api/private/downloading", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ teams }),
		});

		const blob = await res.blob();
		const url = window.URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "bedwars-config.zip";
		a.click();
		window.URL.revokeObjectURL(url);
	};

	const handleSubmitInsert = async (e: React.FormEvent) => { //	Пример добавления команды в БД. Можно испольковать как добавление какого то товара 
		e.preventDefault();
		const res = await fetch("/api/private/insert-db", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				teamName,
				participant1,
				participant2,
			}),
		});

		const data = await res.json();
		setMsg(data.success
			? `✅ Команда добавлена!`
			: `❌ ${data.message}`);
		if (data.success) {
			setTeamName("");
			setParticipant1("");
			setParticipant2("");
		} else {
			console.log(data.error)
		}
	};
	const handleSubmitAddingRole = async (e: React.FormEvent) => { //	Добавление роли
		e.preventDefault();
		const res = await fetch("/api/private/add-role", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				roleName,
			}),
		});

		const data = await res.json();
		setMsg(data.success
			? `✅ ${data.message}`
			: `❌ ${data.message}`);
		if (data.success) {
			setRoleName("");
			setRoleNameStatus({ color: "", text: "" });
			setRoleNameBtnStatus({ state: true, text: "Добавить" })
			setAddRoleModalSwitcher(false)
			setAllRoles(data.updated)
			setInitialRoles(data.updated);
			roles = data.updated
		} else {
			console.log(data.error)
		}
	};
	const handleSubmitDeleteRole = async (e: React.FormEvent) => { //	Удаление роли
		e.preventDefault();
		const res = await fetch("/api/private/delete-role", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				deleteRole,
			}),
		});

		const data = await res.json();
		setMsg(data.success
			? `✅ ${data.message}`
			: `❌ ${data.message}`);
		if (data.success) {
			setDeleteRole("");
			setDeleteRoleModalSwitcher(false)
			setAllRoles(data.updated)
			setInitialRoles(data.updated);
			roles = data.updated
		} else {
			console.log(data.error)
		}
	};
	const handleSubmitUser = async (e: React.FormEvent) => { //	Редактор пользователей панели управления
		e.preventDefault();
		let wt = count
		setUserBtnStatus({ state: true, text: wt.toString() })
		wt--
		const intervalId = setInterval(() => {
			setUserBtnStatus({ state: true, text: wt.toString() })
			wt--
		}, 1000);
		setTimeout(() => {
			clearInterval(intervalId);
			setUserBtnStatus({ state: false, text: (action === "delete" ? "Удалить" : "Добавить") })
		}, (count + 1) * 1000)

		const res = await fetch("/api/private/action-user", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				login,
				password,
				ipStr,
				usrRole,
				action
			}),
		});

		const data = await res.json();
		setMsg(data.success
			? `✅ ${data.message}`
			: `❌ ${data.message}`);
		if (data.success) {
			setLogin("");
			setPassword("");
			setIPs("");
			setUsrRole("Выберите роль")
			setLoginStatus({ color: "", text: "" })
		} else {
			console.log(data.error)
		}
	};
	const handleSubmitEditUser = async (e: React.FormEvent) => { //	Редактор пользователей панели управления
		e.preventDefault();
		let wt = count
		setUserBtnStatus({ state: true, text: wt.toString() })
		wt--
		const intervalId = setInterval(() => {
			setUserBtnStatus({ state: true, text: wt.toString() })
			wt--
		}, 1000);
		setTimeout(() => {
			clearInterval(intervalId);
			setUserBtnStatus({ state: false, text: "Изменить" })
		}, (count + 1) * 1000)

		const res = await fetch("/api/private/editing-user", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				login,
				password,
				usrRole,
				action
			}),
		});

		const data = await res.json();
		setMsg(data.success
			? `✅ ${data.message}`
			: `❌ ${data.message}`);
		if (data.success) {
			setLogin("");
			setPassword("");
			setIPs("");
			setUsrRole("Выберите роль")
			setLoginStatus({ color: "", text: "" })
		} else {
			console.log(data.error)
		}
	};

	const handleSaveRoles = async () => { 	// Сохранение изменений в ролях
		if (!hasChanges) return;

		const res = await fetch('/api/private/editing-roles', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(allRoles),
		});

		const data = await res.json() as { message: string, success: boolean, error: unknown, updated: Roles };
		setMsg(data.success
			? `✅ ${data.message}`
			: `❌ ${data.message}`);
		if (data.success) {
			setInitialRoles(data.updated);
			roles = data.updated
		} else {
			console.log(data.error)
		}
	};
	const moveRole = (movedRole: string, direction: "up" | "down") => { 	//	Движение ролей
		const order = Object.keys(allRoles);
		const index = order.indexOf(movedRole);
		if (index === -1) return;

		const targetIndex = direction === "up" ? index - 1 : index + 1;
		if (targetIndex < 0 || targetIndex >= order.length) return;

		const newOrder = [...order];
		[newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
		console.log(newOrder, order)

		const newRoles: typeof roles = {};
		newOrder.forEach((key) => {
			newRoles[key] = roles[key];
		});

		setAllRoles(newRoles);
	};
	const LoginChecker = async (value: string) => {	//	Проверка логина, есть ли он или нет
		// Останавливаем предыдущий запрос
		if (abortController) abortController.abort();

		const controller = new AbortController();
		setAbortController(controller);

		if (value.length <= 2) {
			if (action === "delete") {
				setUserBtnStatus({ state: true, text: "Удалить" })
				setLoginStatus({ color: "#F54927", text: "⨯ Логин должен быть больше 2 символов" });
			} else {
				setUserBtnStatus({ state: true, text: "Добавить" })
				setLoginStatus({ color: "#F54927", text: "⨯ Логин должен быть больше 2 символов" });
			}
			return;
		}

		try {
			const res = await fetch('/api/login-checker', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ login: value }),
				signal: controller.signal,
			});
			const data = await res.json();

			if (data.exists) {
				if (action === "delete") {
					setUserBtnStatus({ state: false, text: "Удалить" })
					setLoginStatus({ color: "#2EFF52", text: "✓ Найден" });
				} else {
					setUserBtnStatus({ state: true, text: "Добавить" })
					setLoginStatus({ color: "#F54927", text: "⨯ Занято" });
				}
			} else {
				if (action === "delete") {
					setUserBtnStatus({ state: true, text: "Удалить" })
					setLoginStatus({ color: "#F54927", text: "⨯ Не найден" });
				} else {
					setUserBtnStatus({ state: false, text: "Добавить" })
					setLoginStatus({ color: "#2EFF52", text: "✓ Свободен" });
				}
			}
		} catch (err: unknown) {
			if (err instanceof Error) {
				if (err.name === 'AbortError') return;
				console.error("Ошибка при проверке логина:", err);
			} else {
				console.error('Unknown error', err);
			}
		}
	};
	const LoginParser = async (value: string) => {	//	Проверка логина, есть ли он или нет
		// Останавливаем предыдущий запрос
		if (abortController) abortController.abort();

		const controller = new AbortController();
		setAbortController(controller);

		if (value.length <= 2) {
			return;
		}

		try {
			const res = await fetch('/api/login-checker', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ login: value }),
				signal: controller.signal,
			});
			const data = await res.json();

			if (data.exists) {
				setUsrRole(data.role);
				setUserBtnStatus({ state: false, text: "Изменить" })
				setLoginStatus({ color: "#2EFF52", text: "✓ Существует" });
			} else {
				setUserBtnStatus({ state: false, text: "Изменить" })
				setLoginStatus({ color: "#F54927", text: "✓ Не существует" });
			}
		} catch (err: unknown) {
			if (err instanceof Error) {
				if (err.name === 'AbortError') return;
				console.error("Ошибка при проверке логина:", err);
			} else {
				console.error('Unknown error', err);
			}
		}
	};
	const RoleChecker = async (value: string) => {	//	Проверка название роли, есть ли он или нет
		// Останавливаем предыдущий запрос
		if (abortController) abortController.abort();

		const controller = new AbortController();
		setAbortController(controller);

		if (value.length <= 2) {
			setRoleNameBtnStatus({ state: true, text: "Добавить" })
			setRoleNameStatus({ color: "#F54927", text: "⨯ Название роли должено быть больше 2 символов" });
			return;
		}

		try {
			const res = await fetch('/api/role-checker', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ roleName: value }),
				signal: controller.signal,
			});
			const data = await res.json();

			if (data.exists) {
				setRoleNameStatus({ color: "#F54927", text: "⨯ Занято" });
				setRoleNameBtnStatus({ state: true, text: "Добавить" })
			}
			else {
				setRoleNameStatus({ color: "#2EFF52", text: "✓ Свободно" });
				setRoleNameBtnStatus({ state: false, text: "Добавить" })
			}
		} catch (err: unknown) {
			if (err instanceof Error) {
				if (err.name === 'AbortError') return;
				console.error("Ошибка при проверке роли:", err);
			} else {
				console.error('Unknown error', err);
			}
		}
	};


	let isRoleFound = false;
	const NotAllowedToEditRoles = new Array(0);

	if (access && role && permissions) return <main className="min-h-screen p-5 bg-black bg-fixed flex flex-col items-center text-white font-['Montserrat']">
		<Link href={"/"} className="p-12">logo</Link>
		<p className="text-[24px] font-semibold">Добро пожаловать в панель управления!</p>
		<section className="border m-2 p-3 rounded border-white/30 w-full max-w-[850px]">
			<div>
				<h3>Пользователи:</h3>
				<ul>
					{onlineUsers.map((user) => (
						<li key={user}>{user}</li>
					))}

				</ul>
			</div>
		</section>
		{permissions.includes("action-user") ?
			<section id="action-user" className="border m-2 p-3 rounded border-white/30 w-full max-w-[850px]">
				{action === "user" ? <h2 className="font-bold text-lg mb-2">Добавить пользователя</h2> : action === "IP" ? <h2 className="font-bold text-lg mb-2">Добавить IP</h2> : <h2 className="font-bold text-lg mb-2">Удалить пользователя</h2>}
				<form
					onSubmit={handleSubmitUser}
				>
					<div>
						<label>
							<input
								type="radio"
								name="action"
								checked={action === 'user'}
								onChange={() => {
									setAction('user')
									setUserBtnStatus({ state: true, text: "Добавить" })
								}}
							/> Добавить нового пользователя
						</label>
						<label className="m-4">
							<input
								type="radio"
								name="action"
								checked={action === 'IP'}
								onChange={() => {
									setAction('IP')
									setUserBtnStatus({ state: false, text: "Добавить" })
								}}
							/> Добавить IP в whitelist
						</label>
						<label >
							<input
								type="radio"
								name="action"
								checked={action === 'delete'}
								onChange={() => {
									setAction('delete')
									setUserBtnStatus({ state: true, text: "Удалить" })
								}}
							/> Удалить пользвателя
						</label>
					</div>
					{action === 'user' ?
						<>
							<input
								className="p-3 m-2 bg-white/10 backdrop-blur-md border border-white/30 rounded-3xl order-1"
								placeholder="Логин"
								value={login}
								onChange={
									async (e) => {
										setLogin(e.target.value);
										LoginChecker(e.target.value);
									}
								}
							/>
							<input
								className="p-3 m-2 bg-white/10 backdrop-blur-md border border-white/30 rounded-3xl"
								placeholder="Пароль"
								type={visablePass}
								value={password}
								onChange={(e) => setPassword(e.target.value)}
							/>
							<input
								className="p-3 m-2 bg-white/10 backdrop-blur-md border border-white/30 rounded-3xl"
								placeholder="IPs (писать через запятую, без пробелов)"
								value={ipStr}
								onChange={(e) => setIPs(e.target.value)}
							/>
							<select className="p-3 m-2 bg-white/10 backdrop-blur-md border border-white/30 rounded-3xl text-white" value={usrRole} onChange={(e) => setUsrRole(e.target.value)}>
								<option className="text-black" value="" selected>Выберите роль</option>
								{Object.keys(roles).map((perm) => {
									return (
										<option className="text-black" key={perm} value={perm}>{perm}</option>
									);
								})}
							</select>

							<button disabled={userBtnStatus.state} className="bg-green-200/10 backdrop-blur-md border border-green-500/30 rounded-xl px-6 py-2 text-white text-lg font-semibold shadow-md hover:bg-green-400/20 transition duration-300">{userBtnStatus.text}</button>
							<div style={{ color: loginStatus.color }}>{loginStatus.text}</div>
							<label>
								<input
									type="checkbox"
									name="action"
									checked={visablePass === 'text'}
									onChange={(e) => setVisabilityPass(e.target.checked ? "text" : "password")}
								/> Показать пароль
							</label>

						</>
						: action === "IP" ?
							<>
								<input
									className="p-3 m-2 bg-white/10 backdrop-blur-md border border-white/30 rounded-3xl"
									placeholder="IP"
									value={ipStr}
									onChange={(e) => setIPs(e.target.value)}
								/>
								<button disabled={userBtnStatus.state} className="bg-green-200/10 backdrop-blur-md border border-green-500/30 rounded-xl px-6 py-2 text-white text-lg font-semibold shadow-md hover:bg-green-400/20 transition duration-300">{userBtnStatus.text}</button>
							</>
							: action === "delete" ?
								<>
									<input
										className="p-3 m-2 bg-white/10 backdrop-blur-md border border-white/30 rounded-3xl"
										placeholder="Логин"
										value={login}
										onChange={
											async (e) => {
												setLogin(e.target.value);
												LoginChecker(e.target.value);
											}
										}
									/>
									<button disabled={userBtnStatus.state} className="bg-red-200/10 backdrop-blur-md border border-red-500/30 rounded-xl px-6 py-2 text-white text-lg font-semibold shadow-md hover:bg-red-400/20 transition duration-300">{userBtnStatus.text}</button>
									<div style={{ color: loginStatus.color }}>{loginStatus.text}</div>
								</>
								: null
					}
				</form>
			</section>
			: null
		}
		{permissions.includes("editing-user") ?
			<section id="editing-user" className="border m-2 p-3 rounded border-white/30 w-full max-w-[850px]">
				<h2 className="font-bold text-lg mb-2">Редактор пользователей</h2>
				<div>
					<label>
						<input
							type="radio"
							name="action"
							checked={action === 'edit-role'}
							onChange={() => {
								setAction('edit-role')
								setUserBtnStatus({ state: true, text: "Изменить" })
							}}
						/> Изменить роль у пользователя
					</label>
					<label className="m-4">
						<input
							type="radio"
							name="action"
							checked={action === 'edit-password'}
							onChange={() => {
								setAction('edit-password')
								setUserBtnStatus({ state: true, text: "Изменить" })
							}}
						/> Изменить пароль у пользователя
					</label>
				</div>
				<form
					onSubmit={handleSubmitEditUser}
				>
					{action === 'edit-role' ?
						<>
							<input
								className="p-3 m-2 bg-white/10 backdrop-blur-md border border-white/30 rounded-3xl"
								placeholder="Логин"
								value={login}
								onChange={
									async (e) => {
										setLogin(e.target.value);
										LoginParser(e.target.value);
									}
								}
							/>
							<select className="p-3 m-2 bg-white/10 backdrop-blur-md border border-white/30 rounded-3xl text-white" value={usrRole} onChange={(e) => setUsrRole(e.target.value)}>
								<option className="text-black" value="" selected>Выберите роль</option>
								{Object.keys(roles).map((perm) => {
									return (
										<option className="text-black" key={perm} value={perm}>{perm}</option>
									);
								})}
							</select>
							<button disabled={userBtnStatus.state} className="bg-white/10 backdrop-blur-md border border-white/30 rounded-xl px-6 py-2 text-white text-lg font-semibold shadow-md hover:bg-white/20 transition duration-300">{userBtnStatus.text}</button>
							<div style={{ color: loginStatus.color }}>{loginStatus.text}</div>
						</>
						: action === 'edit-password' ?
							<>
								<input
									className="p-3 m-2 bg-white/10 backdrop-blur-md border border-white/30 rounded-3xl"
									placeholder="Логин"
									value={login}
									onChange={
										async (e) => {
											setLogin(e.target.value);
											LoginParser(e.target.value);
										}
									}
								/>
								<input
									className="p-3 m-2 bg-white/10 backdrop-blur-md border border-white/30 rounded-3xl"
									placeholder="Новый пароль"
									value={password}
									onChange={
										async (e) => {
											setPassword(e.target.value);
										}
									}
								/>
								<button disabled={userBtnStatus.state} className="bg-white/10 backdrop-blur-md border border-white/30 rounded-xl px-6 py-2 text-white text-lg font-semibold shadow-md hover:bg-white/20 transition duration-300">{userBtnStatus.text}</button>
								<div style={{ color: loginStatus.color }}>{loginStatus.text}</div>
							</>
							: null
					}
				</form>
			</section>
			: null
		}
		{permissions.includes("editing-roles") ?
			<section id="editing-roles" className="border m-2 p-3 rounded border-white/30 w-full max-w-[850px]">
				<h2 className="font-bold text-lg mb-2">Редактор ролей</h2>
				<h3 className="font-medium text-lg ">Роли:</h3>
				<div className="flex flex-col">
					{Object.keys(allRoles).map((tempRole, i) => {
						const isCurrent = tempRole === role;
						const isDisabled = !isRoleFound;
						if (!isRoleFound && !isCurrent) NotAllowedToEditRoles.push(tempRole);
						if (isCurrent) {
							isRoleFound = true;
							NotAllowedToEditRoles.push(tempRole);
						}

						const isFirst = i === 0 || i - NotAllowedToEditRoles.length === 0;
						const isLast = i === Object.keys(allRoles).length - 1;



						return (
							<span key={tempRole} className="flex gap-1 items-center">
								<button
									className="text-2xl disabled:opacity-50"
									disabled={isFirst || isDisabled}
									onClick={() => moveRole(tempRole, "up")}
								>
									↑
								</button>
								<button
									className="text-2xl disabled:opacity-50"
									disabled={isLast || isDisabled}
									onClick={() => moveRole(tempRole, "down")}
								>
									↓
								</button>
								<label className="cursor-pointer">
									<input
										className="peer"
										type="radio"
										name="role"
										hidden
										checked={editRole === tempRole}
										onChange={() => {
											setEditRole(tempRole);
											setRemainingPermissions(
												listPermissions.filter((perm: string) => !allRoles[tempRole].includes(perm))
											);
										}}
									/>
									<div
										className={`peer-checked:font-semibold ${!isDisabled ? "" : "text-gray-500"
											}`}
									>
										{tempRole}
									</div>
								</label>
								{permissions.includes("delete-role") ? <>
									<button
										className="cursor-pointer text-xl text-red-700 hover:text-red-700/50 transition duration-300"
										onClick={() => {
											setDeleteRole(tempRole)
											setDeleteRoleModalSwitcher(true)
										}}
									>
										–
									</button>

								</>
									: null
								}
							</span>
						);
					})}
					<Modal isOpen={deleteRoleModalSwitcher} onClose={() => setDeleteRoleModalSwitcher(false)}>
						<h2 className="text-xl font-bold mb-4">Удаление роли</h2>
						<p className="font-extrabold m-2">Вы уверены что хотите удалить роль {deleteRole}</p>
						<form
							onSubmit={handleSubmitDeleteRole}
						>
							<input
								hidden
								placeholder="Название роли"
								value={deleteRole}
							/>
							<button type="submit" className="bg-red-200/10 backdrop-blur-md border border-red-500/30 rounded-xl px-6 py-2 text-white text-lg font-semibold shadow-md hover:bg-red-400/20 transition duration-300">Да</button>
						</form>
					</Modal>
				</div>

				<div className="mt-4 grid grid-cols-2 gap-6">
					<div>
						<div className="font-medium mb-1">Выданные права ({editRole}):</div>
						<ul className="list-disc pl-5">
							{allRoles[editRole]?.map((perm) => {
								const isDisabled = !permissions.includes(perm) || NotAllowedToEditRoles.includes(editRole);
								return (
									<li
										key={perm}
										className={isDisabled ? "text-gray-500" : "cursor-pointer hover:underline"}
										onClick={() => {
											if (!isDisabled) {
												setAllRoles((prev) => ({
													...prev,
													[editRole]: prev[editRole].filter((p) => p !== perm),
												}));
												setRemainingPermissions((prev) => [...prev, perm]);
											}
										}}
									>
										{perm}
									</li>
								);
							})}
						</ul>
					</div>
					<div>
						<div className="font-medium mb-1">Доступные, но не выданные:</div>
						<ul className="list-disc pl-5 ">
							{remainingPermissions.map((perm) => {
								const isDisabled = !permissions.includes(perm);
								return (
									<li
										key={perm}
										className={isDisabled ? "text-gray-500" : "cursor-pointer hover:underline"}
										onClick={() => {
											if (!isDisabled) {
												setAllRoles((prev) => ({
													...prev,
													[editRole]: [...prev[editRole], perm],
												}));
												setRemainingPermissions((prev) => prev.filter((p) => p !== perm));
											}
										}}
									>
										{perm}
									</li>
								);
							})}
						</ul>
					</div>
				</div>
				{permissions.includes("add-role") ?
					<>
						<button
							onClick={() => setAddRoleModalSwitcher(true)}
							className="bg-green-200/10 backdrop-blur-md border border-green-500/30 rounded-xl px-6 py-2 text-white m-2 hover:bg-green-400/20 transition duration-300 text-lg font-semibold shadow-md"
						>
							Добавить роль
						</button>
						<Modal isOpen={addRoleModalSwitcher} onClose={() => setAddRoleModalSwitcher(false)}>
							<h2 className="text-xl font-bold mb-4">Добавить роль</h2>
							<form
								onSubmit={handleSubmitAddingRole}
							>
								<input
									className="p-3 m-2 bg-white/10 backdrop-blur-md border border-white/30 rounded-3xl"
									placeholder="Название роли"
									value={roleName}
									onChange={
										async (e) => {
											const value = e.target.value.replace(/[0-9]/g, '');
											setRoleName(value);
											RoleChecker(value);
										}
									}
								/>
								<button type="submit" disabled={roleNameBtnStatus.state} className="bg-green-200/10 backdrop-blur-md border border-green-500/30 rounded-xl px-6 py-2 text-white text-lg font-semibold shadow-md hover:bg-green-400/20 transition duration-300">{roleNameBtnStatus.text}</button>
								<div style={{ color: roleNameStatus.color }}>{roleNameStatus.text}</div>
							</form>
						</Modal>
					</> : null
				}
				<button
					onClick={handleSaveRoles}
					disabled={!hasChanges}
					className={`backdrop-blur-md border rounded-xl px-6 py-2 text-lg font-semibold shadow-md ${hasChanges ? "bg-green-200/10 border-green-500/30 hover:bg-green-400/20 transition duration-300" : "bg-white/30 border-white/30 text-white/40 cursor-not-allowed"
						}`}
				>
					Сохранить изменения
				</button>



			</section>
			: null
		}
		{permissions.includes("insert-db") ?
			<section id="addingteam" className="border m-2 p-3 rounded border-white/30 w-full max-w-[850px]">
				<h2 className="font-bold text-lg mb-2">Добавить команду</h2>
				<form
					onSubmit={handleSubmitInsert}
				>
					<input
						className="p-3 m-2 bg-white/10 backdrop-blur-md border border-white/30 rounded-3xl"
						placeholder="Название команды"
						value={teamName}
						onChange={(e) => setTeamName(e.target.value)}
					/>
					<input
						className="p-3 m-2 bg-white/10 backdrop-blur-md border border-white/30 rounded-3xl"
						placeholder="Участник 1"
						value={participant1}
						onChange={(e) => setParticipant1(e.target.value)}
					/>
					<input
						className="p-3 m-2 bg-white/10 backdrop-blur-md border border-white/30 rounded-3xl"
						placeholder="Участник 2"
						value={participant2}
						onChange={(e) => setParticipant2(e.target.value)}
					/>
					<button className="bg-green-200/10 backdrop-blur-md border border-green-500/30 rounded-xl px-6 py-2 text-white text-lg font-semibold shadow-md hover:bg-green-400/20 transition duration-300">Добавить</button>
				</form>
			</section>
			: null
		}
		{permissions.includes("delete-db") ?
			<section id="delete-team" className="border m-2 p-3 rounded border-white/30 w-full max-w-[850px]">
				<div>
					<h3 className="font-bold text-lg mb-2">Удалить команду</h3>
					<input
						className="p-3 m-2 bg-white/10 backdrop-blur-md border border-white/30 rounded-3xl"
						placeholder="Название команды"
						value={teamToDelete}
						onChange={e => setTeamToDelete(e.target.value)}
					/>
					<button onClick={handleSubmitDelete} className="bg-red-200/10 backdrop-blur-md border border-red-500/30 rounded-xl px-6 py-2 text-white text-lg font-semibold shadow-md hover:bg-red-400/20 transition duration-300">Удалить</button>
				</div>
			</section>
			: null
		}
		{permissions.includes("update-db") ?
			<section id="update-points" className="border m-2 p-3 rounded border-white/30 w-full max-w-[850px]">
				<h2 className="font-bold text-lg mb-2">Добавить/удалить очки</h2>
				<form onSubmit={handleSubmitUpdate} className="space-y-2">
					<div>
						<label>
							<input
								type="radio"
								name="by"
								checked={by === 'team'}
								onChange={() => setBy('team')}
							/> По названию команды
						</label>
						<label className="ml-4">
							<input
								type="radio"
								name="by"
								checked={by === 'nick'}
								onChange={() => setBy('nick')}
							/> По нику игрока
						</label>
					</div>
					<input
						className="p-3 m-2 bg-white/10 backdrop-blur-md border border-white/30 rounded-3xl"
						placeholder={by === 'team' ? "Название команды" : "Ник игрока"}
						value={value}
						onChange={e => setValue(e.target.value)}
					/>
					<input
						type="number"
						className="p-3 m-2 bg-white/10 backdrop-blur-md border border-white/30 rounded-3xl"
						placeholder="Δ очков (положительное или отрицательное)"
						value={delta}
						onChange={e => setDelta(Number(e.target.value))}
					/>
					<button type="submit" className="bg-white/10 backdrop-blur-md border border-white/30 rounded-xl px-6 py-2 text-white text-lg font-semibold shadow-md hover:bg-white/20 transition duration-300">
						Применить
					</button>
				</form>
			</section>
			: null
		}
		{permissions.includes("downloading") ?
			<section id="create-bedwars-config" className=" m-2 p-3 rounded ">
				<button className="bg-white/10 backdrop-blur-md border border-white/30 rounded-xl px-6 py-2 text-white text-lg font-semibold shadow-md hover:bg-white/20 transition duration-300" onClick={handleDownload}>Сгенерировать конфиги</button>
			</section>
			: null
		}

		{msg && <p className="mt-2">{msg}</p>}
		<button className="m-2 bg-red-200/10 backdrop-blur-md border border-red-500/30 rounded-xl px-6 py-2 text-white text-lg font-semibold shadow-md hover:bg-red-400/20 transition duration-300" onClick={async () => {
			await fetch("/api/auth/logout", { method: "POST" })
			location.reload();
		}}>Выйти</button></main>;

	return (
		<main className="w-screen h-screen bg-black bg-fixed flex flex-col items-center font-['Montserrat']">
			<section className="w-full p-12 flex flex-col items-center gap-[48px]">
				<Link href={"/"}>logo</Link>
			</section>
			<p className="text-white sm:text-[25px] text-[10px]">
				Панель управления
			</p>
			<form className="p-2 flex flex-col items-center" onSubmit={handleSubmit}>
				<input
					className="p-4 mb-2 block w-[300px] bg-white/10 backdrop-blur-md border border-white/30 rounded-full text-white"
					placeholder="Логин"
					value={form.login}
					onChange={(e) => setForm({ ...form, login: e.target.value })}
				/>
				<input
					className="p-4 mb-2 block w-[300px] bg-white/10 backdrop-blur-md border border-white/30 rounded-full text-white"
					placeholder="Пароль"
					type={visablePass}
					value={form.password}
					onChange={(e) => setForm({ ...form, password: e.target.value })}
				/>
				<label className="text-white m-2">
					<input
						type="checkbox"
						name="action"
						checked={visablePass === 'text'}
						onChange={(e) => setVisabilityPass(e.target.checked ? "text" : "password")}
					/> Показать пароль
				</label>
				<button className="bg-white/10 backdrop-blur-md border border-white/30 rounded-xl px-6 py-2 text-white text-lg font-semibold shadow-md hover:bg-white/20 transition duration-300" type="submit">
					Войти
				</button>

				{error && <p>{error}</p>}
			</form>
		</main>
	);
}

export async function getServerSideProps(ctx: GetServerSidePropsContext) {
	const token = getTokenFromReq(ctx.req as unknown as NextApiRequest);
	const payload = verifyToken(token || "");
	const valid = token && payload;

	const role = payload?.role;
	const usrLogin = payload?.login;

	const rolesPath = path.join(process.cwd(), "data/roles.json");
	const fileData = await fs.readFile(rolesPath, "utf-8");
	const roles = JSON.parse(fileData);

	const dirPath = path.join(process.cwd(), "src", "pages", "api", "private");
	const files = await fs.readdir(dirPath);

	const listPermissions = files
		.filter((file) => file.endsWith(".ts") || file.endsWith(".js"))
		.map((file) => path.basename(file, path.extname(file)));
	const permissions = role ? roles[role] || [] : [];
	return {
		props: {
			loggedIn: Boolean(valid),
			role: role ?? null,
			permissions,
			roles,
			listPermissions,
			usrLogin: usrLogin ?? null
		},
	};
}

