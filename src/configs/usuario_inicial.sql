/* =====================================================================
   CondoSimples — primeiro usuário ADMIN
   Rodar UMA vez, depois do banco.sql, no banco "condosimples".

   Só um ADMIN cadastra usuários pelo sistema, então o primeiro precisa
   nascer por SQL.
     E-mail: admin@condosimples.com
     Senha:  não fica no repositório — é informada pelo autor do projeto.
             Aqui vai só o hash bcrypt (RNF06), igual ao que a API grava.
   Trocar a senha no primeiro acesso: menu do usuário -> Alterar senha.
        Senha: Condo@simples26
   Rodado de novo, para em uk_usuario_email (o usuário já existe).
   ===================================================================== */

INSERT INTO T_USUARIO (nome, email, senha_hash, perfil)
VALUES ('Administrador', 'admin@condosimples.com',
        '$2b$10$Hj6/dyveUXpC5Kr3r.g83.s1IgcuH/PQ3AXuuMISxoqW9fDLmhzru', 'ADMIN');
